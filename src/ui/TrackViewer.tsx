import Object2D from "./core/Object2D";
import GridLayout from "./GridLayout";
import Rect from "./core/Rect";
import React = require("react");
import ReactObject from "./core/ReactObject";
import Animator from "../animation/Animator";

import IconButton from 'material-ui/IconButton';
import SvgClose from "material-ui/svg-icons/navigation/close";
import SvgAdd from "material-ui/svg-icons/content/add";

class TrackViewer extends Object2D {

    protected tracks: Array<Track> = [
        new Track('Sequence'),
        new Track('GRCh38'),
        new Track('GM12878-DNase'),
    ];

    protected regionViews: Array<RegionView> = [
        { name: 'PCSK9' },
        { name: 'HER2' },
        { name: 'MAOA' },
    ];

    protected edges = {
        vertical: new Array<number>(),
        horizontal: new Array<number>(),
    };

    protected gridLayoutOptions = {
        layoutVerticalRelative: true,
        layoutHorizontalRelative: false,
        spacingAbsolute: {
            x: 10, y: 10,
        },
        spacingRelative: {
            x: 0.0, y: 0.0,
        }
    }

    protected trackHeaderWidth_px: number = 210;
    protected regionViewHeaderHeight_px: number = 50;
    protected defaultTrackHeight_px: number = 100;

    protected gridContainer: Object2D;
    protected trackHeaderContainer: Object2D;

    // cell = grid[column][row]
    protected gridCells:Array<Array<Object2D>>;
    protected trackHeaders:Array<Object2D>;
    protected regionViewHeaders:Array<ReactObject>;

    protected addRegionButton: ReactObject;

    constructor() {
        super();
        this.render = false;

        // fill parent dimensions
        this.layoutW = 1;
        this.layoutH = 1;

        this.gridContainer = new Object2D();
        this.add(this.gridContainer);
        this.trackHeaderContainer = new Object2D();
        this.add(this.trackHeaderContainer);

        this.gridCells = new Array<Array<Object2D>>();
        this.trackHeaders = new Array<Object2D>();
        this.regionViewHeaders = new Array<ReactObject>();

        this.dummyInitialize();
        
        // add addRegion button to the last regionView
        this.addRegionButton = new ReactObject(this.addRegionButtonElement({ onAdd: () => this.addRegionView() }), this.regionViewHeaderHeight_px, this.regionViewHeaderHeight_px);
        this.addRegionButton.layoutParentX = 1;
        this.addRegionButton.x = this.gridLayoutOptions.spacingAbsolute.x;
        
        this.regionViewHeaders[this.regionViewHeaders.length - 1].add(this.addRegionButton);
        

        this.layout(false);

       (window as any).removeCol = (i:number) => {
           this.removeRegionViewIndex(i);
       }
       (window as any).addRegion = () => {
           this.addRegionView();
       }

       let test = new Rect(30, 30, [0.1, 0.4, 0.8, 1]);
       test.z = 1;
       this.add(test);

       let k = 80;
       window.addEventListener('mousemove', (e) => {
           Animator.springTo(test, { x: e.clientX, y: e.clientY }, 1, k, Math.sqrt(k) * 2);
       });
    }

    protected addRegionView() {
        this.regionViewHeaders[this.regionViewHeaders.length - 1].remove(this.addRegionButton);

        this.regionViews.push({name: 'New'});
        this.dummyInitializeColumn(this.regionViews.length - 1);

        this.regionViewHeaders[this.regionViewHeaders.length - 1].add(this.addRegionButton);

        let edges = this.edges.vertical;
        let newEdge = 1 + 1 / (this.edges.vertical.length - 1);
        edges.push(newEdge);
        this.layout(false);

        let multiplier = 1 / newEdge;
        for (let e = 0; e < edges.length; e++) {
            edges[e] *= multiplier;
        }

        this.layout(true);
    }

    protected removeRegionView(regionView: RegionView) {
        this.removeRegionViewIndex(this.regionViews.indexOf(regionView));
    }
    
    protected removeRegionViewIndex(columnIndex: number) {
        let col = this.gridCells[columnIndex];
        if (col != null) {
            if (columnIndex === (this.regionViewHeaders.length - 1)) {
                this.regionViewHeaders[this.regionViewHeaders.length - 1].remove(this.addRegionButton);
                this.regionViewHeaders[this.regionViewHeaders.length - 2].add(this.addRegionButton);
            }

            for (let i = 0; i < col.length; i++) {
                this.gridContainer.remove(col[i]);
            }
            this.gridCells.splice(columnIndex, 1);
            this.regionViews.splice(columnIndex, 1);
            this.regionViewHeaders.splice(columnIndex, 1);
        }

        for (let i = 0; i < this.regionViews.length; i++) {
            this.regionViewHeaders[i].content = this.regionViewHeaderElement({
                name: this.regionViews[i].name,
                onClose: () => {
                    this.removeRegionView(this.regionViews[i]);
                },
                enableClose: this.regionViews.length > 1
            });
        }

        GridLayout.removeColumnSpaceFill(this.edges.vertical, columnIndex);
        this.layout();
    }

    protected layout(animate: boolean = true) {
        // layout grid container
        this.gridContainer.x = this.trackHeaderWidth_px + this.gridLayoutOptions.spacingAbsolute.x * 0.5;
        this.gridContainer.w =
            -this.trackHeaderWidth_px - this.gridLayoutOptions.spacingAbsolute.x
            -this.addRegionButton.w;
        this.gridContainer.y = this.regionViewHeaderHeight_px;
        this.gridContainer.h = -this.regionViewHeaderHeight_px;
        this.gridContainer.layoutW = 1;
        this.gridContainer.layoutH = 1;
        // layout track header container
        this.trackHeaderContainer.w = this.trackHeaderWidth_px;
        this.trackHeaderContainer.y = this.regionViewHeaderHeight_px;
        this.trackHeaderContainer.x = this.gridLayoutOptions.spacingAbsolute.x;

        // layout track headers as a 1 column grid
        // this is done so this fix-widths grid is independent from any changes in the flexible width grid
        GridLayout.layoutGridCells(
            [this.trackHeaders],
            {
                vertical: [0, this.trackHeaderWidth_px],
                horizontal: this.edges.horizontal,
            },
            {
                layoutVerticalRelative: false,
                layoutHorizontalRelative: false,
                spacingAbsolute: {
                    x: 0,
                    y: this.gridLayoutOptions.spacingAbsolute.y
                },
                spacingRelative: { x: 0, y: 0 },
            }
        );

        let tension = 240;
        let friction = Math.sqrt(tension) * 2;

        for (let c = 0; c < this.gridCells.length; c++) {
            let column = this.gridCells[c];
            for (let r = 0; r < column.length; r++) {
                let cell = column[r];

                let fieldTargets = {};
                GridLayout.layoutGridCell(fieldTargets as any, c, r, this.edges, this.gridLayoutOptions);
                Animator.springTo(cell, fieldTargets, animate ? 1 : 0, tension, friction);
            }
        }
    }

    protected dummyInitialize() {
        let nColumns = this.regionViews.length;
        let nRows = this.tracks.length;

        // create track header objects
        for (let r = 0; r < nRows; r++) {
            let track = this.tracks[r];
            let trackHeader = new ReactObject(this.trackHeaderElement({ name: track.name }), 0, 0);
            this.trackHeaders[r] = trackHeader;
            this.trackHeaderContainer.add(trackHeader);
        }

        // fill the grid cells up with some rects
        for (let c = 0; c < nColumns; c++) {
            this.dummyInitializeColumn(c);
        }

        for (let c = 0; c < nColumns + 1; c++) this.edges.vertical[c] = c / nColumns;
        for (let r = 0; r < nRows + 1; r++) this.edges.horizontal[r] = r * 100;
    }

    protected dummyInitializeColumn(c: number) {
        let nColumns = this.regionViews.length;
        let nRows = this.tracks.length;

        let col = new Array<Object2D>(nRows);
        this.gridCells[c] = col;
        for (let r = 0; r < nRows; r++) {
            let cell = new Object2D();
            col[r] = cell;
            this.gridContainer.add(cell);

            // add rect for visibility
            let rect = new Rect(0, 0, [0, 0, 0, 1.]);
            rect.layoutW = 1;
            rect.layoutH = 1;
            cell.add(rect);

            if (r === 0) {
                let regionView = this.regionViews[c];
                let regionViewHeader = new ReactObject(this.regionViewHeaderElement({
                    name: regionView.name,
                    onClose: () => {
                        this.removeRegionView(regionView);
                    },
                    enableClose: this.regionViews.length > 1
                }), 0, 0);
                regionViewHeader.layoutW = 1;
                regionViewHeader.h = this.regionViewHeaderHeight_px;
                regionViewHeader.layoutY = -1;
                regionViewHeader.y = -this.gridLayoutOptions.spacingAbsolute.y * 0.5;
                this.regionViewHeaders[c] = regionViewHeader;
                cell.add(regionViewHeader);
            }
        }
    }

    protected trackHeaderElement(props: {
        name: string
    }) {
        return <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                color: '#e8e8e8',
                backgroundColor: '#171615',
                borderRadius: '8px 0px 0px 8px',
                fontSize: '15px',
            }}
        >
            <div style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'center',
                top: '50%',
                transform: 'translate(0, -50%)',
            }}>
                {props.name}
            </div>
        </div>
    }

    protected regionViewHeaderElement(props: {
        name: string,
        enableClose: boolean,
        onClose: () => void
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
            }}
        >
            <div style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'center',
                top: '50%',
                transform: 'translate(0, -50%)',
            }}>
                {props.name}
            </div>
            {props.enableClose ?
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    textAlign: 'right',
                    top: '50%',
                    transform: 'translate(0, -50%)',
                }}>
                    <IconButton onClick={props.onClose}>
                        <SvgClose color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)'/>
                    </IconButton>
                </div>

                : null
            }
        </div>
    }

    protected addRegionButtonElement(props: {
        onAdd: () => void
    }) {
        return <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                color: '#e8e8e8',
                backgroundColor: '#171615',
                borderRadius: '8px 0px 0px 8px',
            }}
        >
            <div style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'right',
                top: '50%',
                transform: 'translate(0, -50%)',
            }}>
                <IconButton onClick={props.onAdd}>
                    <SvgAdd color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
                </IconButton>
            </div>
        </div>
    }

}

class Track {

    name: string;

    constructor(name: string) {
        this.name = name;
    }

}

type RegionView = {
    name: string
}

export default TrackViewer;