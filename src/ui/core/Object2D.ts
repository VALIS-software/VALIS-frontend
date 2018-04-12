import { Renderable, RenderableInternal } from '../../rendering/Renderable';
import { EventEmitter } from 'events';
import { debug } from 'util';

export type Object2DInternal = RenderableInternal & {
    handlesPointerEvents: boolean,
    eventEmitter: EventEmitter,
    worldTransformNeedsUpdate: boolean,
    worldTransformMat4: Float32Array,
    computedX: number,
    computedY: number,
    computedWidth: number,
    computedHeight: number,
}

/**
 * Implements 2D transforms, hierarchical layout and user interaction event handling
 * - Doesn't imply any particular display units
 */
export class Object2D extends Renderable<Object2D> {

    // position
    set x(v: number) { this._x = v; this.worldTransformNeedsUpdate = true; }
    get x() { return this._x; }
    set y(v: number) { this._y = v; this.worldTransformNeedsUpdate = true; }
    get y() { return this._y; }
    set z(v: number) { this._z = v; this.worldTransformNeedsUpdate = true; }
    get z() { return this._z; }

    // scale
    set sx(v: number) { this._sx = v; this.worldTransformNeedsUpdate = true; }
    get sx() { return this._sx; }
    set sy(v: number) { this._sy = v; this.worldTransformNeedsUpdate = true; }
    get sy() { return this._sy; }
    set sz(v: number) { this._sz = v; this.worldTransformNeedsUpdate = true; }
    get sz() { return this._sz }

    // width & height
    // interpreted individually by subclasses and does not correspond directly to vertex geometry
    set w(w: number) { this._w = w; this.worldTransformNeedsUpdate = true; };
    get w() { return this._w; }
    set h(h: number) { this._h = h; this.worldTransformNeedsUpdate = true; };
    get h() { return this._h; }

    /**
     * When computing the world-transform, layoutX applies an offset in units of _this_ object's width
     */
    set layoutX(wx: number) { this._layoutX = wx; this.worldTransformNeedsUpdate = true; }
    get layoutX() { return this._layoutX; }
    /**
     * When computing the world-transform, layoutY applies an offset in units of _this_ object's height
     */
    set layoutY(hy: number) { this._layoutY = hy; this.worldTransformNeedsUpdate = true; }
    get layoutY() { return this._layoutY; }
    /**
     * When computing the world-transform, layoutParentX applies an offset in units of this object's _parent_ width
     */
    set layoutParentX(wx: number) { this._layoutParentX = wx; this.worldTransformNeedsUpdate = true; }
    get layoutParentX() { return this._layoutParentX; }
    /**
     * When computing the world-transform, layoutParentY applies an offset in units of this object's _parent_ height
     */
    set layoutParentY(hy: number) { this._layoutParentY = hy; this.worldTransformNeedsUpdate = true; }
    get layoutParentY() { return this._layoutParentY; }
    /**
     * When computing the world-transform, applies an offset to this object's width in units of this Object's parent width
     */
    set layoutW(w: number) { this._layoutW = w; this.worldTransformNeedsUpdate = true; }
    get layoutW() { return this._layoutW; }
    /**
     * When computing the world-transform, applies an offset to this object's height in units of this Object's parent height
     */
    set layoutH(h: number) { this._layoutH = h; this.worldTransformNeedsUpdate = true; }
    get layoutH() { return this._layoutH; }

    // transform parameters
    protected _x: number = 0;
    protected _y: number = 0;
    protected _z: number = 0;
    protected _sx: number = 1;
    protected _sy: number = 1;
    protected _sz: number = 1;

    protected _w: number = 0;
    protected _h: number = 0;

    // layout parameters
    protected _layoutX: number = 0;
    protected _layoutY: number = 0;
    protected _layoutParentX: number = 0;
    protected _layoutParentY: number = 0;
    protected _layoutW: number = 0;
    protected _layoutH: number = 0;

    protected handlesPointerEvents: Boolean = false;
    protected pointerEventCount = 0;
    protected cursorStyle: null | string = null;

    protected worldTransformNeedsUpdate = true;
    protected worldTransformMat4 = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);

    protected computedX: number = 0;
    protected computedY: number = 0;
    protected computedWidth: number = 0;
    protected computedHeight: number = 0;

    protected eventEmitter = new EventEmitter();

    constructor() {
        super();
        // set render to false for instances of Object2D and true for subclasses
        let isSubclass = Object.getPrototypeOf(this) !== Object2D.prototype;
        this.render = isSubclass;
    }

    add(child: Object2D) {
        super.add(child);
        child.worldTransformNeedsUpdate = true;
    }

    // @! todo, event and detail type
    onPointerDown(listener: (event: any) => void) {
        this.eventEmitter.on('pointerdown', listener);
        this.pointerEventCount++;
        this.handlesPointerEvents = true;
    }

    onPointerUp(listener: (event: any) => void) {
        this.eventEmitter.on('pointerup', listener);
        this.pointerEventCount++;
        this.handlesPointerEvents = true;
    }

    removePointerDown(listener: (event: any) => void) {
        this.eventEmitter.removeListener('pointerdown', listener);
        this.pointerEventCount--;
        this.handlesPointerEvents = this.pointerEventCount > 0;
    }

    removePointerUp(listener: (event: any) => void) {
        this.eventEmitter.removeListener('pointerup', listener);
        this.pointerEventCount--;
        this.handlesPointerEvents = this.pointerEventCount > 0;
    }
    
    emitPointerDown(detail: any) {
        this.eventEmitter.emit('pointerdown', detail);
    }

    applyTreeTransforms(root: boolean = true) {
        if (root && this.worldTransformNeedsUpdate) {
            this.layout(0, 0);
            this.applyWorldTransform(null);
        }

        // apply world transform to children
        for (let child of this._children) {
            if (child.worldTransformNeedsUpdate) {
                child.layout(this.computedWidth, this.computedHeight);
                child.applyWorldTransform(this.worldTransformMat4);
            }

            child.applyTreeTransforms(false);
        }
    }

    /**
     * Returns the local-space bounds in world-space coordinates
     * Assumes the scene-graph world transforms are all up-to-date
     */
    getWorldBounds() {
        let w = this.worldTransformMat4;
        let b = this.getLocalBounds();

        return {
            l: w[0] * b.l + w[12],
            r: w[0] * b.r + w[12],
            t: w[5] * b.t + w[13],
            b: w[5] * b.b + w[13],
        }
    }

    /**
     * Returns bounds in local-space coordinate after layout has been applied
     * Must be called _after_ tree transformations have been applied to correctly factor in layout
     */
    protected getLocalBounds() {
        return {
            l: 0,
            r: this.computedWidth,
            t: 0,
            b: this.computedHeight,
        }
    }

    protected layout(parentWidth: number, parentHeight: number) {
        this.computedWidth = this._w + parentWidth * this._layoutW;
        this.computedHeight = this._h + parentHeight * this._layoutH;

        this.computedX = this._x + parentWidth * this._layoutParentX + this.computedWidth * this._layoutX;
        this.computedY = this._y + parentHeight * this._layoutParentY + this.computedHeight * this._layoutY;
    }

    protected applyWorldTransform(transformMat4: Float32Array | null) {
        if (transformMat4 == null) {
            let cx = this.computedX;
            let cy = this.computedY;

            this.worldTransformMat4.set([
                this._sx , 0        , 0        , 0 ,
                0        , this._sy , 0        , 0 ,
                0        , 0        , this._sz , 0 ,
                cx       , cy       , this._z  , 1
            ]);

            this.worldTransformNeedsUpdate = false;

            for (let c of this._children) c.worldTransformNeedsUpdate = true;
        } else {
            let p = transformMat4;

            // in non-rotational affine transformation only elements 0, 5, 12, 13, 14 are non-zero
            // scale
            let m0 = p[0] * this._sx;   // x
            let m5 = p[5] * this._sy;   // y
            let m10 = p[10] * this._sz; // z
            let m15 = 1;                // w

            // translation
            let m12 = p[0] * this.computedX + p[12];  // x
            let m13 = p[5] * this.computedY + p[13];  // y
            let m14 = p[10] * this._z + p[14];        // z

            // set world matrix
            let w = this.worldTransformMat4;
            w[0]  = m0;   w[1] = 0;     w[2] = 0;    w[3] = 0;
            w[4]  = 0;    w[5] = m5;    w[6] = 0;    w[7] = 0;
            w[8]  = 0;    w[9] = 0;    w[10] = m10; w[11] = 0;
            w[12] = m12; w[13] = m13;  w[14] = m14; w[15] = m15;

            this.worldTransformNeedsUpdate = false;

            // if the world matrix of the child has changed, then we must inform the children that they're out of sync also
            for (let cc of this._children) cc.worldTransformNeedsUpdate = true;
        }
    }

}

export default Object2D;