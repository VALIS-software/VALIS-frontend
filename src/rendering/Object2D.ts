import { Renderable, RenderableInternal } from './Renderable';
import { EventEmitter } from 'events';
import { debug } from 'util';

export type Object2DInternal = RenderableInternal & {
    handlesPointerEvents: boolean,
    localTransformMat4: Float32Array,
    worldTransformMat4: Float32Array,
    eventEmitter: EventEmitter,
    worldTransformNeedsUpdate: boolean,
}

/*
	Implements 2D transforms and user interaction event handling
*/
export class Object2D extends Renderable<Object2D> {

    bounds = {
        l: 0, r: 0,
        t: 0, b: 0
    }

    // position
    set x(v: number) { this.localTransformMat4[12] = v; this.worldTransformNeedsUpdate = true; }
    get x() { return this.localTransformMat4[12]; }
    set y(v: number) { this.localTransformMat4[13] = v; this.worldTransformNeedsUpdate = true; }
    get y() { return this.localTransformMat4[13]; }
    set z(v: number) { this.localTransformMat4[14] = v; this.worldTransformNeedsUpdate = true; }
    get z() { return this.localTransformMat4[14]; }

    // scale
    set sx(v: number) { this.localTransformMat4[0] = v; this.worldTransformNeedsUpdate = true; }
    get sx() { return this.localTransformMat4[0]; }
    set sy(v: number) { this.localTransformMat4[5] = v; this.worldTransformNeedsUpdate = true; }
    get sy() { return this.localTransformMat4[5]; }

    protected handlesPointerEvents: Boolean = false;
    protected localTransformMat4 = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    protected worldTransformMat4 = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    protected eventEmitter = new EventEmitter();
    protected cursor = 'pointer';
    protected worldTransformNeedsUpdate = true;

    constructor() {
        super();
        // set render to false for instances of Objec2D and true for subclasses
        let isSubclass = Object.getPrototypeOf(this) !== Object2D.prototype;
        this.render = isSubclass;
    }

    add(child: Object2D) {
        super.add(child);
        child.worldTransformNeedsUpdate = true;
    }

    onPointerDown(listener: (event: any) => void) {
        this.handlesPointerEvents = true;
        this.eventEmitter.on('pointerdown', listener);
    }

    onPointerUp(listener: (event: any) => void) {
        this.handlesPointerEvents = true;
        this.eventEmitter.on('pointerup', listener);
    }

    removePointerDown(listener: (event: any) => void) {
        this.eventEmitter.removeListener('pointerdown', listener);
        this.handlesPointerEvents = this.eventEmitter.eventNames().length > 0;
    }

    removePointerUp(listener: (event: any) => void) {
        this.eventEmitter.removeListener('pointerup', listener);
        this.handlesPointerEvents = this.eventEmitter.eventNames().length > 0;
    }

    emitPointerDown(detail: any) {
        this.eventEmitter.emit('pointerdown', detail);
    }

    removeAllListeners() {
        this.eventEmitter.removeAllListeners();
        this.handlesPointerEvents = false;
    }

    updateWorldTransforms(root: boolean = true) {
        if (root && this.worldTransformNeedsUpdate) {
            this.worldTransformMat4.set(this.localTransformMat4);
            this.worldTransformNeedsUpdate = false;
            for (let c of this._children) c.worldTransformNeedsUpdate = true;
        }

        // apply world transform to children
        for (let child of this._children) {
            if (child.worldTransformNeedsUpdate) {
                let p = this.worldTransformMat4;
                let c = child.localTransformMat4;

                // in non-rotational affine transformation only elements 0, 5, 12, 13, 14 are non-zero
                // scale
                let m0 = p[0] * c[0]; // x
                let m5 = p[5] * c[5]; // y
                let m10 = 1;          // z
                let m15 = 1;          // w 
                // translation
                let m12 = p[0] * c[12] + p[12]; // x
                let m13 = p[5] * c[13] + p[13]; // y
                let m14 =    1 * c[14] + p[13]; // z

                // set world matrix
                let w = child.worldTransformMat4;
                w[0]  = m0;   w[1] = 0;     w[2] = 0;    w[3] = 0;
                w[4]  = 0;    w[5] = m5;    w[6] = 0;    w[7] = 0;
                w[8]  = 0;    w[9] = 0;    w[10] = m10; w[11] = 0;
                w[12] = m12; w[13] = m13;  w[14] = m14; w[15] = m15;

                // child.worldTransformMat4 = this.worldTransformMat4 * child.localTransformMat4
                child.worldTransformNeedsUpdate = false;

                // if the world matrix of the child has changed, then we must inform the children that they're out of sync also
                for (let cc of child._children) cc.worldTransformNeedsUpdate = true;
            }

            child.updateWorldTransforms(false);
        }
    }

}

export default Object2D;