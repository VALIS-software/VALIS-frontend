import Rect from "./core/Rect";
import Panel from "./Panel";
import Track from "./Track";

export class TrackTile extends Rect {

    panel: Panel;

    protected x0: number;
    protected x1: number;

    constructor(readonly track: Track, color: ArrayLike<number>) {
        super(0, 0, color);
        this.cursorStyle = 'crosshair';
        this.addEventListener('pointerdown', () => {
            this.cursorStyle = 'pointer';
        });
        this.addEventListener('pointerup', () => {
            this.cursorStyle = 'crosshair';
        });
        this.addEventListener('dragend', () => {
            this.cursorStyle = 'crosshair';
        });

    }

    setRange(x0: number, x1: number) {
        this.x0 = x0;
        this.x1 = x1;
    }

}

export default TrackTile;