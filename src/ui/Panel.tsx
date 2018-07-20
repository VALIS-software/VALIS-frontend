import IconButton from "material-ui/IconButton";
import SvgEdit from "material-ui/svg-icons/image/edit";
import SvgCancel from "material-ui/svg-icons/navigation/cancel";
import SvgCheck from "material-ui/svg-icons/navigation/check";
import SvgClose from "material-ui/svg-icons/navigation/close";
import * as React from "react";
import { InteractionEvent, WheelDeltaMode, WheelInteractionEvent } from "./core/InteractionEvent";
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";
import { OpenSansRegular } from "./font/Fonts";
import Track, { AxisPointerStyle } from "./tracks/Track";
import XAxis from "./XAxis";

export class Panel extends Object2D {

    column: number; // @! todo: refactor to remove this

    maxRange: number = 1e10;
    minRange: number = 10;

    readonly header: ReactObject;
    readonly xAxis: XAxis;
    readonly resizeHandle: Rect;
    readonly tracks = new Set<Track>();

    get closable(): boolean { return this._closable; }
    get closing(): boolean { return this._closing; }

    set closable(v: boolean) {
        this._closable = v;
        this.updatePanelHeader();
    }
    set closing(v: boolean) {
        this._closing = v;
        this.updatePanelHeader();
    }

    protected _closable = false;
    protected _closing = false;

    // view-state is defined by genomic location
    // viewport is designed to weight high precision to relatively small values (~millions) and lose precision for high values (~billions+)
    // these should only be changed by setContig() and setRange()
    readonly contig: string;
    readonly x0: number = 0;
    readonly x1: number = 1;

    protected activeAxisPointers: { [ pointerId: string ]: number } = {};
    protected secondaryAxisPointers: { [pointerId: string]: number } = {};

    protected tileDragging = false;
    protected tileHovering = false;

    protected formattedContig: string;
    protected isEditing: boolean = false;

    constructor(
        protected onClose: (t: Panel) => void,
        protected readonly spacing: { x: number, y: number },
        protected readonly panelHeaderHeight: number,
        protected readonly xAxisHeight: number,
    ) {
        super();
        // a panel has nothing to render on its own
        this.render = false;

        this.header = new ReactObject();
        this.fillX(this.header);
        this.header.h = this.panelHeaderHeight;
        this.header.layoutY = -1;
        this.header.y = -this.xAxisHeight - this.spacing.y * 0.5;
        this.add(this.header);

        // 1/2 spacing around the x-axis
        let offset = 0.5; // offset labels by 0.5 to center on basepairs
        this.xAxis = new XAxis(this.x0, this.x1, 11, OpenSansRegular, offset, 1, 1);
        this.xAxis.minDisplay = 0;
        this.xAxis.maxDisplay = Infinity;
        this.xAxis.h = this.xAxisHeight;
        this.xAxis.layoutY = -1;
        this.fillX(this.xAxis);
        this.add(this.xAxis);

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

    addTrack(track: Track) {
        track.addInteractionListener('dragstart', this.onTileDragStart);
        track.addInteractionListener('dragmove', this.onTileDragMove);
        track.addInteractionListener('dragend', this.onTileDragEnd);
        track.addInteractionListener('wheel', this.onTileWheel);
        track.addInteractionListener('pointermove', this.onTilePointerMove);
        track.addInteractionListener('pointerleave', this.onTileLeave);

        track.setContig(this.contig);
        track.setRange(this.x0, this.x1);

        this.fillX(track);
        this.add(track);

        this.tracks.add(track);
    }

    removeTrack(track: Track) {
        track.removeInteractionListener('dragstart', this.onTileDragStart);
        track.removeInteractionListener('dragmove', this.onTileDragMove);
        track.removeInteractionListener('dragend', this.onTileDragEnd);
        track.removeInteractionListener('wheel', this.onTileWheel);
        track.removeInteractionListener('pointermove', this.onTilePointerMove);
        track.removeInteractionListener('pointerleave', this.onTileLeave);

        this.remove(track);

        this.tracks.delete(track);
    }

    setContig(contig: string) {
        (this.contig as any) = contig;

        for (let track of this.tracks) {
            track.setContig(contig);
        }

        // parse contig and create a formatted contig
        let chromosomeContigMatch = /chr(.*)$/.exec(contig);
        if (chromosomeContigMatch) {
            this.formattedContig = `Chromosome ${chromosomeContigMatch[1]}`;
        } else {
            this.formattedContig = `<Invalid contig> ${this.contig}`;
        }

        this.updatePanelHeader();
    }

    setRange(x0: number, x1: number) {
        // if range is not a finite number then default to 0 - 1
        x0 = isFinite(x0) ? x0 : 0;
        x1 = isFinite(x1) ? x1 : 1;

        // if range is below allowed minimum, override without changing center
        let span = x1 - x0;
        if (span < this.minRange) {
            let midIndex = (x0 + x1) * 0.5;
            x0 = midIndex - this.minRange * 0.5;
            x1 = midIndex + this.minRange * 0.5;
            span = this.minRange;
        }

        (this.x0 as any) = x0;
        (this.x1 as any) = x1;

        this.xAxis.setRange(x0, x1);
        
        // control axis text length by number of visible base pairs
        // when viewing a small number of bases the exact span is likely required
        if (span < 150) {
            this.xAxis.maxTextLength = Infinity;
        } else if (span < 1e5) {
            this.xAxis.maxTextLength = 6;
        } else {
            this.xAxis.maxTextLength = 4;
        }

        for (let tile of this.tracks) {
            tile.setRange(x0, x1);
        }

        this.updatePanelHeader();
    }

    setSecondaryAxisPointers(secondaryAxisPointers: { [ pointerId: string ]: number }) {
        // remove any old and unused axis pointers
        for (let pointerId in this.secondaryAxisPointers) {
            if (secondaryAxisPointers[pointerId] === undefined && this.activeAxisPointers[pointerId] === undefined) {
                for (let tile of this.tracks) {
                    tile.removeAxisPointer(pointerId);
                }
            }
        }

        // add or update secondary axis pointers
        for (let pointerId in secondaryAxisPointers) {
            // if this panel has this pointer as an active axis pointer, skip it
            if (this.activeAxisPointers[pointerId] !== undefined) {
                continue;
            }

            let absX = secondaryAxisPointers[pointerId];

            let span = this.x1 - this.x0;
            let fractionX = (absX - this.x0) / span;

            this.secondaryAxisPointers[pointerId] = absX;

            for (let tile of this.tracks) {
                tile.setAxisPointer(pointerId, fractionX, AxisPointerStyle.Secondary);
            }
        }
    }

    protected onTileLeave = (e: InteractionEvent) => {
        this.tileHovering = false;
        if (!this.tileDragging) {
            this.removeActiveAxisPointer(e);
        }
    }

    protected onTilePointerMove = (e: InteractionEvent) => {
        this.tileHovering = true;
        this.setActiveAxisPointer(e);
    }

    protected onTileWheel = (e: WheelInteractionEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let xScrollDomPx = 0;
        let yScrollDomPx = 0;

        // determine panning delta in dom pixels from horizontal scroll amount
        switch (e.wheelDeltaMode) {
            default:
            case WheelDeltaMode.Pixel: {
                xScrollDomPx = e.wheelDeltaX;
                yScrollDomPx = e.wheelDeltaY;
                break;
            }
            case WheelDeltaMode.Line: {
                // assume a line is roughly 12px (needs experimentation)
                xScrollDomPx = e.wheelDeltaX * 12;
                yScrollDomPx = e.wheelDeltaY * 12;
                break;
            }
            case WheelDeltaMode.Page: {
                // assume a page is roughly 1000px (needs experimentation)
                xScrollDomPx = e.wheelDeltaX * 1000;
                yScrollDomPx = e.wheelDeltaY * 1000;
                break;
            }
        }

        // gesture disambiguation; when dominantly zooming we want to reduce panning speed
        // normalize scroll vector
        let scrollVectorLengthSq = xScrollDomPx * xScrollDomPx + yScrollDomPx * yScrollDomPx;
        // avoid divide by 0 normalization issues
        if (scrollVectorLengthSq <= 0) {
            scrollVectorLengthSq = 1;
        }
        let scrollVectorLength = Math.sqrt(scrollVectorLengthSq);
        let normScrollX = xScrollDomPx / scrollVectorLength; // cosAngleY
        let normScrollY = yScrollDomPx / scrollVectorLength; // cosAngleX
        // as normScrollVectorY approaches 1, we should scale xScrollDomPx to
        let absAngleY = Math.acos(Math.abs(normScrollY));
        let fractionalAngleY = 2 * absAngleY / (Math.PI); // 0 = points along y, 1 = points along x
        let absAngleX = Math.acos(Math.abs(normScrollX));
        let fractionalAngleX = 2 * absAngleX / (Math.PI); // 0 = points along x, 1 = points along y
        
        // use fraction angle to reduce x as angle approaches y-pointing
        // see https://www.desmos.com/calculator/butkwn0xdt for function exploration
        let edge = 0.75;
        let xReductionFactor = Math.sin(
            Math.pow(Math.min(fractionalAngleY / edge, 1), 3) * (Math.PI / 2)
        );
        let yReductionFactor = Math.sin(
            Math.pow(Math.min(fractionalAngleX / edge, 1), 3) * (Math.PI / 2)
        );

        xScrollDomPx = xScrollDomPx * xReductionFactor;
        yScrollDomPx = yScrollDomPx * yReductionFactor;

        // compute zoom multiplier from wheel y
        let zoomFactor = 1;
        if (e.ctrlKey) {
            // pinch zoom
            zoomFactor = 1 + e.wheelDeltaY * 0.01; // I'm assuming mac trackpad outputs change in %, @! needs research
        } else {
            // scroll zoom
            let scrollZoomSpeed = 0.3;
            zoomFactor = 1 + yScrollDomPx * 0.01 * scrollZoomSpeed;
        }

        let x0 = this.x0;
        let x1 = this.x1;
        let span = x1 - x0;
        
        // apply scale change
        let zoomCenterF = e.fractionX;

        // clamp zoomFactor to range limits
        if (span * zoomFactor > this.maxRange) {
            zoomFactor = this.maxRange / span;
        }
        if (span * zoomFactor < this.minRange) {
            zoomFactor = this.minRange / span;
        }

        let d0 = span * zoomCenterF;
        let d1 = span * (1 - zoomCenterF);
        let p = d0 + x0;

        x0 = p - d0 * zoomFactor;
        x1 = p + d1 * zoomFactor;

        let newSpan = x1 - x0;
        let midSpan = (newSpan + span) * 0.5;

        // offset by x-scroll
        let basePairsPerPixel = midSpan / this.getComputedWidth();
        let xScrollBasePairs = basePairsPerPixel * xScrollDomPx;
        x0 = x0 + xScrollBasePairs;
        x1 = x1 + xScrollBasePairs;

        this.setRange(x0, x1);
    }

    // drag state
    protected _dragXF0: number;
    protected _dragX00: number;
    // track total drag distance to hint whether or not we should cancel some interactions
    protected _lastDragLX: number;
    protected _dragDist: number;
    protected onTileDragStart = (e: InteractionEvent) => {
        if (e.buttonState !== 1) return;

        e.preventDefault();
        e.stopPropagation();

        this._dragXF0 = e.fractionX;
        this._dragX00 = this.x0;

        this._lastDragLX = e.localX;
        this._dragDist = 0;

        this.tileDragging = true;
    }

    protected onTileDragMove = (e: InteractionEvent) => {
        if (e.buttonState !== 1) return;

        e.preventDefault();
        e.stopPropagation();

        this.tileDragging = true;

        let span = this.x1 - this.x0;

        let dxf = e.fractionX - this._dragXF0;
        let x0 = this._dragX00 + span * (-dxf);
        let x1 = x0 + span;

        this._dragDist += Math.abs(e.localX - this._lastDragLX);
        this._lastDragLX = e.localX;

        this.setRange(x0, x1);

        this.setActiveAxisPointer(e);
    }

    protected onTileDragEnd = (e: InteractionEvent) => {
        e.stopPropagation();

        // if total drag distance, preventDefault so that pointerup isn't fired for other nodes
        if (this._dragDist > 4) {
            e.preventDefault();
        }

        this.tileDragging = false;

        if (!this.tileHovering) {
            this.removeActiveAxisPointer(e);
        }
    }

    protected setActiveAxisPointer(e: InteractionEvent) {
        let fractionX = e.fractionX;
        let span = this.x1 - this.x0;
        let axisPointerX = span * fractionX + this.x0;

        this.activeAxisPointers[e.pointerId] = axisPointerX;

        for (let tile of this.tracks) {
            tile.setAxisPointer(e.pointerId.toString(), fractionX, AxisPointerStyle.Active);
        }

        // broadcast active axis pointer change
        this.eventEmitter.emit('axisPointerUpdate', this.activeAxisPointers);
    }

    protected removeActiveAxisPointer(e: InteractionEvent) {
        if (this.activeAxisPointers[e.pointerId] === undefined) {
            return;
        }

        delete this.activeAxisPointers[e.pointerId];

        for (let tile of this.tracks) {
            tile.removeAxisPointer(e.pointerId.toString());
        }

        this.eventEmitter.emit('axisPointerUpdate', this.activeAxisPointers);
    }

    protected fillX(obj: Object2D) {
        obj.x = this.spacing.x * 0.5;
        obj.layoutX = 0;
        obj.layoutParentX = 0;
        obj.layoutW = 1;
        obj.w = -this.spacing.x;
    }

    protected updatePanelHeader() {
        let rangeString = `${XAxis.formatValue(this.x0, 8)}bp to ${XAxis.formatValue(this.x1, 8)}bp`;

        const startBp = Math.floor(this.x0).toFixed(0);
        const endBp = Math.ceil(this.x1).toFixed(0);
        let rangeSpecifier = `${this.contig}:${startBp}-${endBp}`;

        this.header.content = <PanelHeader 
            panel={ this }
            contig={ this.formattedContig }
            rangeString={ rangeString }
            rangeSpecifier={ rangeSpecifier }
            enableClose = { this._closable && !this.closing } 
            onClose = { this.onClose } 
            isEditing = { this.isEditing }
            onEditCancel = { () => this.finishEditing() }
            onEditSave = { (rangeSpecifier: string) => this.finishEditing(rangeSpecifier) }
            onEditStart = { () => this.startEditing() }
        />;
    }

    protected finishEditing(rangeSpecifier?: string) {
        this.isEditing = false;
        if (rangeSpecifier) {
            this.setRangeUsingRangeSpecifier(rangeSpecifier);
        }
        this.updatePanelHeader();
    }

    protected startEditing() {
        this.isEditing = true;
        this.updatePanelHeader();
    }

    protected setRangeUsingRangeSpecifier(specifier: string) {
        let parts = specifier.split(':');
        let contig = parts[0];

        // make chrx to chrX
        let chromosomeContigMatch = /chr(.*)$/.exec(contig);
        if (chromosomeContigMatch) {
            contig = 'chr' + chromosomeContigMatch[1].toUpperCase();
        }

        const ranges = parts[1].split('-');
        this.setContig(contig);
        this.setRange(parseFloat(ranges[0]), parseFloat(ranges[1]));
    }

}

interface PanelProps {
    panel: Panel,
    contig: string,
    rangeString: string,
    rangeSpecifier: string,
    enableClose: boolean,
    isEditing: boolean,
    onEditStart: () => void,
    onEditSave: (rangeSpecifier: string) => void,
    onEditCancel: () => void,
    onClose: (panel: Panel) => void
}

class PanelHeader extends React.Component<PanelProps,{}> {
    
    rangeSpecifier: string;

    render() {
        let headerContents = null;
        
        const headerContainerStyle : React.CSSProperties= {
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
        };

        const headerStyle : React.CSSProperties = {
            marginTop: 8, 
            marginLeft: 8
        }

        const iconColor = 'rgb(171, 171, 171)';
        const iconHoverColor = 'rgb(255, 255, 255)';
        const iconViewBoxSize = '0 0 32 32';
        
        const closeIcon = this.props.enableClose ?
            (<div style={{
                position: 'absolute',
                right: 0
            }}>
                <IconButton onClick={() => this.props.onClose(this.props.panel)}>
                    <SvgClose color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
                </IconButton>
            </div>) : null


        if (this.props.isEditing) {
            headerContents = (<div style={headerContainerStyle} >
                <span><input
                    onChange={(e) => this.rangeSpecifier = e.target.value}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            this.props.onEditSave(this.rangeSpecifier);
                        }
                    }}
                    type="text"
                    defaultValue={this.props.rangeSpecifier}></input></span>
                <span style={headerStyle}>
                    <SvgCancel 
                        onClick={() => this.props.onEditCancel()} 
                        viewBox={iconViewBoxSize}
                        color={iconColor}
                        hoverColor={iconHoverColor} 
                    />
                </span>
                <span style={headerStyle}>
                    <SvgCheck 
                        onClick={() => this.props.onEditSave(this.rangeSpecifier)} 
                        viewBox={iconViewBoxSize}color={iconColor}
                        hoverColor={iconHoverColor} 
                    />
                </span>
                {closeIcon}
            </div>);
        } else {
            headerContents = (<div style={headerContainerStyle} onClick={() => this.props.onEditStart()}>
                <span><b>{this.props.contig}</b> {this.props.rangeString}</span>
                <span style={headerStyle}>
                    <SvgEdit 
                        viewBox={iconViewBoxSize}
                        color={iconColor}
                        hoverColor={iconHoverColor} 
                    />
                </span>
                {closeIcon}
            </div>);
        }

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
                whiteSpace: 'nowrap',
                cursor: 'pointer',
            }}>
                {headerContents}
            </div>
        </div>
    }
}

export default Panel;