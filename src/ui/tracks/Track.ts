import Animator from "../../animation/Animator";
import UsageCache from "../../ds/UsageCache";
import { Tile } from "../../model/data-store/TileStore";
import { TrackModel } from "../../model/TrackModel";
import { TrackTypeMap } from "../../model/TrackTypeMap";
import Rect from "../core/Rect";
import Text from "../core/Text";
import { OpenSansRegular } from "../font/Fonts";

export class Track<ModelType extends keyof TrackTypeMap = keyof TrackTypeMap> extends Rect {

    protected contig: string | undefined;
    protected x0: number;
    protected x1: number;
    protected pointerY0: number = 0;
    
    protected defaultCursor = 'crosshair';

    protected axisPointers: { [id: string]: AxisPointer } = {};
    protected activeAxisPointerColor = [1, 1, 1, 0.8];
    protected secondaryAxisPointerColor = [0.2, 0.2, 0.2, 1];

    protected loadingIndicator: LoadingIndicator;

    protected displayNeedUpdate = true;

    constructor(protected model: TrackModel<ModelType>) {
        super(0, 0, [0, 0, 0, 1]);

        this.cursorStyle = this.defaultCursor;
    
        this.addInteractionListener('pointerdown', () => this.cursorStyle = 'pointer');
        this.addInteractionListener('pointerup', () => this.cursorStyle = this.defaultCursor);
        this.addInteractionListener('dragend', () => this.cursorStyle = this.defaultCursor);

        this.loadingIndicator = new LoadingIndicator();
        this.loadingIndicator.cursorStyle = 'pointer';
        this.loadingIndicator.layoutY = -1;
        this.loadingIndicator.layoutParentY = 1;
        this.loadingIndicator.x = 10;
        this.loadingIndicator.y = -10;
        this.add(this.loadingIndicator);
        // @! depth-box, should be at top, maybe layoutParentZ = 1
        // - be careful to avoid conflict with cursor
        this.toggleLoadingIndicator(false, false);

        this.initializeYDrag();
    }

    setContig(contig: string) {
        this.contig = contig;
        this.displayNeedUpdate = true;
    }

    setRange(x0: number, x1: number) {
        this.x0 = x0;
        this.x1 = x1;
        this.displayNeedUpdate = true;
    }

    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle) {
        let withinBounds = fractionX >= 0 && fractionX <= 1;

        let axisPointer = this.axisPointers[id];

        if (axisPointer === undefined) {
            // !withinBounds means do not draw, so we don't need to create the object
            if (!withinBounds) return;
            // create axis pointer
            axisPointer = new AxisPointer(style, this.activeAxisPointerColor, this.secondaryAxisPointerColor);
            axisPointer.z = 2;
            this.add(axisPointer);
            this.axisPointers[id] = axisPointer;
        }

        axisPointer.render = withinBounds;

        if (withinBounds) {
            axisPointer.layoutParentX = fractionX;
        }

        if (axisPointer.style !== style) {
            axisPointer.setStyle(style);
        }
    }

    removeAxisPointer(id: string) {
        let axisPointer = this.axisPointers[id];

        if (axisPointer === undefined) {
            return;
        }

        this.remove(axisPointer);
        delete this.axisPointers[id];
    }

    protected defaultDragStart = (e: any) => {
        if (!e.isPrimary) return;
        if (e.buttonState !== 1) return;
        this.pointerY0 = e.localY;
    }

    protected defaultDragMove = (e: any) => {
        if (!e.isPrimary) return;
        if (e.buttonState !== 1) return;
        let dy = this.pointerY0 - e.localY;
        this.eventEmitter.emit('setScroll', -dy);
    }

    protected initializeYDrag() {
        this.addInteractionListener('dragstart', this.defaultDragStart);
        this.addInteractionListener('dragmove', this.defaultDragMove);
    }

    private _lastComputedWidth: number;
    applyTransformToSubNodes(root?: boolean) {
        // update tiles if we need to
        if ((this._lastComputedWidth !== this.getComputedWidth()) || this.displayNeedUpdate) {
            this.updateDisplay();
            this._lastComputedWidth = this.getComputedWidth();
        }

        super.applyTransformToSubNodes(root);
    }

    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();

        // fetch and display data

        this.displayNeedUpdate = false;
        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
    }

    /**
     * Show or hide the loading indicator via animation
     * This function can be safely called repeatedly without accounting for the current state of the indicator
     */
    protected toggleLoadingIndicator(visible: boolean, animate: boolean) {
        // we want a little bit of delay before the animation, for this we use a negative opacity when invisible
        let targetOpacity = visible ? 1 : -0.1;

        if (animate) {
            Animator.springTo(this.loadingIndicator, { 'opacity': targetOpacity }, 50);
        } else {
            Animator.stop(this.loadingIndicator, ['opacity']);
            this.loadingIndicator.opacity = targetOpacity;
        }
    }

    // when we're waiting on data from a tile we add a complete listener to update the annotation when the data arrives
    protected createTileLoadingDependency = (tile: Tile<any>) => {
        tile.addEventListener('complete', this.onDependentTileComplete);
        return tile;
    }

    protected removeTileLoadingDependency = (tile: Tile<any>) => {
        tile.removeEventListener('complete', this.onDependentTileComplete);
    }

    protected onDependentTileComplete = () => {
        this.updateDisplay();
    }

}

export enum AxisPointerStyle {
    Active = 0,
    Secondary = 1,
}

class AxisPointer extends Rect {

    readonly style: AxisPointerStyle;

    constructor(style: AxisPointerStyle, readonly activeColor: ArrayLike<number>, readonly secondaryColor: ArrayLike<number>) {
        super(0, 0);
        this.layoutX = -0.5;
        this.layoutH = 1;
        this.w = 1;
        this.setStyle(style);
    }
    
    setStyle(style: AxisPointerStyle) {
        switch (style) {
            case AxisPointerStyle.Active:
                this.color.set(this.activeColor);
                break;
            case AxisPointerStyle.Secondary:
                this.color.set(this.secondaryColor);
                break;
        }

        (this.style as any) = style;
    }

}

class LoadingIndicator extends Text {

    constructor() {
        super(OpenSansRegular, 'Loading', 12, [1, 1, 1, 1]);
    }

}

export default Track;