import Rect from "./core/Rect";
import Panel from "./Panel";
import Track from "./Track";

export class TrackTile extends Rect {

    panel: Panel;

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
}

export default TrackTile;