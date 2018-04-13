import { tmpdir } from "os";

/**
 * JavaScript port of my haxe physically based animation library
 */
export class Animator {

    // @! probably should be linked list
    protected static active = new Array<{
        object: any,
        easingFields: { [key: string]: void },
        dynamicMotionFields: { [key: string]: {
            state: DynamicMotionState,

            target: number,
            step: (dt_ms: number, state: DynamicMotionState, parameters: any) => void,
            parameters: any,
        } },
    }>();

    public static springTo(
        object: any,
        fieldTargets: {[key: string]: number},

        duration_s: number = 1, // todo

        tension: number,
        friction: number
    ) {
        if (duration_s == 0) {
            Animator.setObjectFields(object, fieldTargets);
        } else {
            Animator.stepTo(object, fieldTargets, Animator.stringStep, {
                tension: tension,
                friction: friction,
            });
        }
    }

    public static stepTo<T>(
        object: any,
        fieldTargets: { [key: string]: number },
        step: (dt_ms: number, state: DynamicMotionState, parameters: T) => void,
        parameters: T
    ) {
        
        let entry = Animator.getActive(object);
        if (entry == null) {
            entry = {
                object: object,
                easingFields: {},
                dynamicMotionFields: {},
            }
            Animator.active.push(entry);
        }

        let fields = Object.keys(fieldTargets);
        for (let field of fields) {
            // remove an easing entry if it exists
            delete entry.easingFields[field];

            let target = fieldTargets[field];
            let current = object[field];
            if (target === current) continue;

            let dynamicMotion = entry.dynamicMotionFields[field];
            // create or update dynamic motion fields
            if (dynamicMotion == null) {
                dynamicMotion = {
                    state: {
                        // initial state
                        x: target - current,
                        v: 0,
                        pe: 0,
                    },

                    target: fieldTargets[field],
                    step: step,
                    parameters: parameters,
                };
                entry.dynamicMotionFields[field] = dynamicMotion;
            } else {
                dynamicMotion.state.x = target - current;
                dynamicMotion.target = target;
                dynamicMotion.step = step;
                dynamicMotion.parameters = parameters;
            }
        }
    }
    
    public static stop(object: any, fields?: Array<string> | { [key: string]: number }) {
        if (fields == null) {
            Animator.removeActive(object);
        } else {
            let {entry: entry, i: i} = Animator.getActiveAndIndex(object);

            let fieldNames = Array.isArray(fields) ? fields : Object.keys(fields);

            for (let field of fieldNames) {
                delete entry.dynamicMotionFields[field];
                delete entry.easingFields[field];
            }

            // if there's no field animations left then remove the entry
            if ((Object.keys(entry.dynamicMotionFields).length + Object.keys(entry.easingFields).length) === 0) {
                Animator.active.splice(i, 1);
            }
        }
    }

    public static step(dt_s: number) {
        for (let i = Animator.active.length - 1; i >= 0; i--) {
            let entry = Animator.active[i];
            let object = entry.object;

            // @! todo, support fix-path easings

            let dynamicMotionFields = Object.keys(entry.dynamicMotionFields);
            for (let field of dynamicMotionFields) {
                let dynamicMotion = entry.dynamicMotionFields[field];
                
                dynamicMotion.state.x = dynamicMotion.target - object[field];
                dynamicMotion.step(dt_s, dynamicMotion.state, dynamicMotion.parameters);
                object[field] = dynamicMotion.target - dynamicMotion.state.x;

                // in joules
                let kineticEnergy = .5 * dynamicMotion.state.v * dynamicMotion.state.v;
                let totalEnergy = dynamicMotion.state.pe + kineticEnergy;

                if (totalEnergy < 0.0001) {
                    delete entry.dynamicMotionFields[field];
                    object[field] = dynamicMotion.target
                }
            }

            // if there's no field animations left then remove the entry
            if ((Object.keys(entry.dynamicMotionFields).length + Object.keys(entry.easingFields).length) === 0) {
                Animator.active.splice(i, 1);
                console.log('deleted obj', object);
            }
        }
    }

    private static stringStep(dt_s: number, state: DynamicMotionState, parameters: {
        tension: number,
        friction: number,
    }) {
        // semi-analytic spring, unconditionally stable
        // references:
        // http://mathworld.wolfram.com/OverdampedSimpleHarmonicMotion.html
        // http://mathworld.wolfram.com/CriticallyDampedSimpleHarmonicMotion.html
        
        let k = parameters.tension;
        let f = parameters.friction;
        let t = dt_s;
        let v0 = state.v;
        let x0 = state.x;

        // useful quantities
        let critical = k * 4 - f * f;

        // over-damped, requires an alternative solution
        if (critical === 0) {
            let w = Math.sqrt(k);
            let A = x0;
            let B = v0 + w * x0;
            
            let e = Math.exp(-w * t);
            state.x = (A + B * t) * e;
            state.v = (B - w * (A + B * t)) * e;
        } else if (critical <= 0) {
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

    private static getActiveAndIndex(object: any) {
        for (let i = 0; i < Animator.active.length; i++) {
            let entry = Animator.active[i];
            if (entry.object === object) return {
                i: i,
                entry: entry
            }
        }
        return null;
    }

    private static removeActive(object: any) {
        for (let i = Animator.active.length - 1; i >= 0; i--) {
            if (Animator.active[i].object === object) {
                Animator.active.splice(i, 1);
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

type DynamicMotionState = {
    x: number,
    v: number,
    pe: number,
}

export default Animator;