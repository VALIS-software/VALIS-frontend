type DynamicMotionState = {
    x: number,
    v: number,
    a: number,
}

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
        duration_s: number,
        parameter: number
    ) {
        if (duration_s == 0) {
            Animator.setObjectFields(object, fieldTargets);
        } else {
            Animator.stepTo(object, fieldTargets, Animator.stringStep, {
                stiffness: 10,
                damping: 4,
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

            let dynamicMotion = entry.dynamicMotionFields[field];
            // create or update dynamic motion fields
            if (dynamicMotion == null) {
                dynamicMotion = {
                    state: {
                        // initial state
                        x: target - current,
                        v: 0,
                        a: 0
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
            }

            // @! todo, delete completed animations
        }
    }

    private static stringStep(dt_s: number, state: DynamicMotionState, parameters: {
        stiffness: number,
        damping: number,
    }) {
        let iterations = 1;
        let idt_s = dt_s / iterations;
        for (let i = 0; i < iterations; i++) {
            // F = -kx - vc, m = 1
            state.a = -parameters.stiffness * state.x - parameters.damping * state.v;
            // semi-implicit euler
            state.v += state.a * idt_s;
            state.x += state.v * idt_s;
        }
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

export default Animator;