import Rect from "../core/Rect";
import Panel from "../Panel";
import TrackRow from "../TrackRow";
import { InteractionEvent } from "../core/InteractionEvent";
import { TrackDataModel } from "../../model/TrackDataModel";

export class Track extends Rect {

    panel: Panel;

    protected x0: number;
    protected x1: number;
    
    protected defaultCursor = 'crosshair';

    protected axisPointers: { [id: string]: AxisPointer } = {};
    protected activeAxisPointerColor = [0, 140 / 255, 186 / 255, 1];
    protected secondaryAxisPointerColor = [0.2, 0.2, 0.2, 1];

    constructor(protected model: TrackDataModel) {
        super(0, 0, [0, 0, 0, 1]);

        this.cursorStyle = this.defaultCursor;
    
        this.addInteractionListener('pointerdown', () => this.cursorStyle = 'pointer');
        this.addInteractionListener('pointerup', () => this.cursorStyle = this.defaultCursor);
        this.addInteractionListener('dragend', () => this.cursorStyle = this.defaultCursor);
    }

    setRange(x0: number, x1: number) {
        this.x0 = x0;
        this.x1 = x1;
    }

    setAxisPointer(id: string, fractionX: number, style: AxisPointerStyle) {
        let withinBounds = fractionX >= 0 && fractionX <= 1;

        let axisPointer = this.axisPointers[id];

        if (axisPointer === undefined) {
            // !withinBounds means do not draw, so we don't need to create the object
            if (!withinBounds) return;
            // create axis pointer
            axisPointer = new AxisPointer(style, this.activeAxisPointerColor, this.secondaryAxisPointerColor);
            axisPointer.z = 1;
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

export default Track;