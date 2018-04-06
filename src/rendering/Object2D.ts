import { Renderable, RenderableInternal } from './Renderable';
import { EventEmitter } from 'events';

export type Object2DInternal = RenderableInternal & {
    handlesPointerEvents: boolean;
    localTransformMat4: Float32Array;
    eventEmitter: EventEmitter;
    _worldTransformMat4: Float32Array;
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
    protected worldTransformMat4 = new Float32Array(16);
    protected eventEmitter = new EventEmitter();
    protected cursor = 'pointer';

    constructor() {
        super();
        // @! if this is a subclass of Object2D, set render to true, otherwise false
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

}

export default Object2D;