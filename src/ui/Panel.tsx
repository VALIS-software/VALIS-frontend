import React = require("react");
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";

import PanelDataModel from "../model/PanelDataModel";

import IconButton from 'material-ui/IconButton';
import SvgClose from "material-ui/svg-icons/navigation/close";
import TrackTile from "./TrackTile";

export class Panel extends Object2D {

    column: number;
    readonly header: ReactObject;
    readonly resizeHandle: Rect;

    get closable(): boolean { return this._closable; }
    get closing(): boolean { return this._closing; }

    set closable(v: boolean) {
        this._closable = v;
        this.updatePanelHeader();
    }
    set closing(v: boolean) {
        this._closing = v;
        this.setResizable(!v);
        this.updatePanelHeader();
    }

    protected _closable = false;
    protected _closing = false;

    constructor(
        readonly model: PanelDataModel,
        column: number,
        protected onClose: (t: Panel) => void,
        protected readonly spacing: { x: number, y: number },
        protected readonly panelHeaderHeight: number,
        protected readonly xAxisHeight: number,
    ) {
        super();
        // a panel has nothing to render on its own
        this.render = false;

        this.column = column;

        this.header = new ReactObject();
        this.fillX(this.header);
        this.header.h = this.panelHeaderHeight;
        this.header.layoutY = -1;
        this.header.y = -this.xAxisHeight - this.spacing.y * 0.5;
        this.add(this.header);

        // 1/2 spacing around the x-axis
        let xAxis = new Rect(0, 0, [0, 0, 1, 1]);
        xAxis.h = this.xAxisHeight;
        xAxis.layoutY = -1;
        this.fillX(xAxis);
        this.add(xAxis);

        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle.layoutX = -0.5;
        this.resizeHandle.layoutX = -0.5;
        this.resizeHandle.layoutParentX = 1;
        this.resizeHandle.layoutParentX = 1;
        this.resizeHandle.w = this.spacing.x;
        this.resizeHandle.layoutH = 1;
        this.resizeHandle.z = 1;
        this.resizeHandle.render = false;
        this.setResizable(false);
    }

    setResizable(v: boolean) {
        // handle should only be in the scene-graph if it's resizable
        this.remove(this.resizeHandle);
        if (v) this.add(this.resizeHandle);
        this.resizeHandle.cursorStyle = v ? 'col-resize' : null;
        this.resizeHandle.color.set(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

    addTrackTile(tile: TrackTile) {
        this.fillX(tile);
        if (tile.panel != null) {
            console.error('A track tile has been added to ' + (tile.panel === this ? 'the same panel more than once' : 'multiple panels'));
        }
        tile.panel = this;
        this.add(tile);
    }

    removeTrackTile(tile: TrackTile) {
        this.remove(tile);
    }

    protected fillX(obj: Object2D) {
        obj.x = this.spacing.x * 0.5;
        obj.layoutX = 0;
        obj.layoutParentX = 0;
        obj.layoutW = 1;
        obj.w = -this.spacing.x;
    }

    protected updatePanelHeader() {
        this.header.content = <PanelHeader panel={ this } enableClose = { this._closable && !this.closing } onClose = { this.onClose } />;
    }

}

function PanelHeader(props: {
    panel: Panel,
    enableClose: boolean,
    onClose: (panel: Panel) => void
}) {
    return <div
        style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            color: '#e8e8e8',
            backgroundColor: '#171615',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 200,
            overflow: 'hidden',
            userSelect: 'none',
        }}
    >
        <div style={{
            position: 'absolute',
            width: '100%',
            textAlign: 'center',
            top: '50%',
            transform: 'translate(0, -50%)',
        }}>
            {props.panel.model.name}
        </div>
        {props.enableClose ?
            <div style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'right',
                top: '50%',
                transform: 'translate(0, -50%)',
            }}>
                <IconButton onClick={() => props.onClose(props.panel)}>
                    <SvgClose color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
                </IconButton>
            </div>

            : null
        }
    </div>
}

export default Panel;