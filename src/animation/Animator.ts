/**
 * Physically based animation
 * 
 * Todo:
 * - Improve data structures:
 *      - Can we avoid brute-force searches? (We should store hidden fields on the object, ugly but fast)
 * - Parameterize springs by duration and normalized dampening
 * - Replace energy threshold with some user-controlled parameter
 * - Implement traditional easing via step functions
 * - For fixed time springs we can implement a fix/physical blended version of springStep, that lerps to 0 as t -> duration
 */
export class Animator {

    // @! maybe better as a linked list - less error prone and potentially faster
    protected static active = new Set<{
        object: any,
        animatingFields: { [key: string]: {
            state: AnimationState,
            target: number,
            step: (dt_ms: number, state: AnimationState, parameters: any) => void,
            parameters: any,
        } },
    }>();

    protected static stepCallbacks = new Set<(steppedAnimationCount: number) => void>();

    protected static animationCompleteCallbacks = new Set<{
        callback: (object: any) => void,
        object: any,
        field: string,
        once: boolean,
    }>();

    public static springTo(
        object: any,
        fieldTargets: { [key: string]: number },

        /* @! Parameterization thoughts:
            - Resolution / or the size for which no change will be perceived
            - Duration to reach this state
            - [Some sort of normalized wobblyness control], 0 = no energy loss, 0.5 = critical, 1 = ?
        */
        parameters: {
            tension: number,
            friction: number,
        },
        velocity?: number,
    ) {
        Animator.stepTo(object, fieldTargets, Animator.stringStep, parameters, velocity);
    }

    public static stepTo<T>(
        object: any,
        fieldTargets: { [key: string]: number },
        step: (dt_ms: number, state: AnimationState, parameters: T) => void,
        parameters: T,
        velocity?: number
    ) {
        let t_s = window.performance.now() / 1000;

        let entry = Animator.getActive(object);
        if (entry == null) {
            entry = {
                object: object,
                animatingFields: {},
            }
            Animator.active.add(entry);
        }

        let fields = Object.keys(fieldTargets);
        for (let field of fields) {
            let target = fieldTargets[field];
            let current = object[field];

            let animation = entry.animatingFields[field];
            // create or update dynamic motion fields
            if (animation == null) {
                animation = {
                    state: {
                        // initial state
                        x: target - current,
                        v: velocity == null ? 0 : velocity,
                        pe: 0,

                        t0: t_s,
                        lastT: t_s,
                    },

                    target: fieldTargets[field],
                    step: step,
                    parameters: parameters,
                };
                entry.animatingFields[field] = animation;
            } else {
                // animation is already active, update state
                animation.state.x = target - current;
                animation.state.v = velocity == null ? animation.state.v : velocity;
                animation.state.t0 = t_s; // set t0 so easings are reset
                animation.target = target;
                animation.step = step;
                animation.parameters = parameters;
            }
        }
    }
    
    public static stop(object: any, fields?: Array<string> | { [key: string]: number }) {
        if (fields == null) {
            Animator.removeActive(object);
        } else {
            let entry = Animator.getActive(object);

            if (entry === null) return;
            
            let fieldNames = Array.isArray(fields) ? fields : Object.keys(fields);

            for (let field of fieldNames) {
                delete entry.animatingFields[field];
            }

            // if there's no field animations left then remove the entry
            if (Object.keys(entry.animatingFields).length === 0) {
                Animator.active.delete(entry);
            }
        }
    }

    public static step() {
        let t_s = window.performance.now() / 1000;

        let steppedAnimationCount = 0;

        for (let entry of Animator.active) {
            let object = entry.object;

            // @! todo, support normal fixed-path easings

            let animatingFields = Object.keys(entry.animatingFields);
            for (let field of animatingFields) {
                let animation = entry.animatingFields[field];
                
                animation.state.x = animation.target - object[field];
                animation.step(t_s, animation.state, animation.parameters);
                object[field] = animation.target - animation.state.x;

                steppedAnimationCount++;

                // in joules
                let kineticEnergy = .5 * animation.state.v * animation.state.v;
                let totalEnergy = animation.state.pe + kineticEnergy;

                // @! magic number: can we derive a condition that's linked to user-known properties
                if (totalEnergy < 0.000001) {
                    delete entry.animatingFields[field];
                    object[field] = animation.target;

                    Animator.fieldComplete(object, field);
                }
            }

            // if there's no field animations left then remove the entry
            if (Object.keys(entry.animatingFields).length === 0) {
                Animator.active.delete(entry);
            }
        }

        // execute post-step callbacks
        for (let callback of Animator.stepCallbacks) {
            callback(steppedAnimationCount);
        }
    }

    public static hasActiveAnimations(): boolean {
        return Animator.active.size > 0;
    }

    public static addAnimationCompleteCallback<T>(object: T, field: string, callback: (object: T) => void, once: boolean = true) {
        Animator.animationCompleteCallbacks.add({
            callback: callback,
            object: object,
            field: field,
            once: once,
        });
    }

    public static removeAnimationCompleteCallbacks<T>(object: T, field: string, callback: (object: T) => void) {
        let removed = 0;

        for (let e of Animator.animationCompleteCallbacks) {
            if (
                e.callback === callback &&
                e.field === field &&
                e.object === object
            ) {
                Animator.animationCompleteCallbacks.delete(e);
                removed++;
            }
        }

        return removed > 0;
    }

    /**
     * It's often useful to be able to execute code straight after the global animation step has finished
     */
    public static addStepCompleteCallback(callback: (steppedAnimationCount: number) => void) {
        Animator.stepCallbacks.add(callback);
    }

    public static removeStepCompleteCallback(callback: (steppedAnimationCount: number) => void) {
        return Animator.stepCallbacks.delete(callback);
    }

    private static fieldComplete(object: any, field: string) {
        for (let e of this.animationCompleteCallbacks) {
            if (e.object === object && e.field === field) {
                // delete the callback if set to 'once'
                if (e.once) {
                    Animator.animationCompleteCallbacks.delete(e);
                }
                e.callback(object);
            }
        }
    }

    private static stringStep(t_s: number, state: AnimationState, parameters: {
        tension: number,
        friction: number,
    }) {
        let dt_s = t_s - state.lastT;
        state.lastT = t_s;

        // analytic integration (unconditionally stable)
        // references:
        // http://mathworld.wolfram.com/OverdampedSimpleHarmonicMotion.html
        // http://mathworld.wolfram.com/CriticallyDampedSimpleHarmonicMotion.html
        
        let k = parameters.tension;
        let f = parameters.friction;
        let t = dt_s;
        let v0 = state.v;
        let x0 = state.x;

        let critical = k * 4 - f * f;

        if (critical === 0) {
            // critically damped
            let w = Math.sqrt(k);
            let A = x0;
            let B = v0 + w * x0;
            
            let e = Math.exp(-w * t);
            state.x = (A + B * t) * e;
            state.v = (B - w * (A + B * t)) * e;
        } else if (critical <= 0) {
            // over-damped
            let sqrt = Math.sqrt(-critical);
            let rp = 0.5 * (-f + sqrt);
            let rn = 0.5 * (-f - sqrt);

            let B = (rn * x0 - v0) / (rn - rp);
            let A = x0 - B;

            let en = Math.exp(rn * t);
            let ep = Math.exp(rp * t);
            state.x = A * en + B * ep;
            state.v = A * rn * en + B * rp * ep;
        } else {
            // under-damped
            let a = -f/2;
            let b = Math.sqrt(critical * 0.25);
            let phaseShift = Math.atan(b / ((v0/x0) - a));

            let A = x0 / Math.sin(phaseShift);
            let e = Math.exp(a * t);
            let s = Math.sin(b * t + phaseShift);
            let c = Math.cos(b * t + phaseShift);
            state.x = A * e * s;
            state.v = A * e * (a * s + b * c);
        }

        state.pe = 0.5 * k * state.x * state.x;
    }

    private static getActive(object: any) {
        for (let entry of Animator.active) {
            if (object === entry.object) return entry;
        }
        return null;
    }

    private static removeActive(object: any) {
        for (let entry of Animator.active) {
            if (entry.object === object) {
                Animator.active.delete(entry);
                return;
            }
        }
    }

    private static setObjectFields(object: any, fieldTargets: { [key: string]: number }) {
        let fields = Object.keys(fieldTargets);
        for (let field of fields) {
            object[field] = fieldTargets[field];
        }
    }

}

type AnimationState = {
    x: number,
    v: number,
    pe: number,

    lastT: number,
    t0: number
}

export default Animator;