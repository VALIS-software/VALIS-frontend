import Object2D from "./core/Object2D";
import GridLayout from "./GridLayout";
import Rect from "./core/Rect";
import React = require("react");
import ReactObject from "./core/ReactObject";

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

    protected gridContainer = new Object2D();

    protected _trackHeaderWidth_px: number = 250;
    protected _regionViewHeaderHeight_px: number = 50;
    protected _defaultTrackHeight_px: number = 100;

    constructor() {
        super();
        this.render = false;

        // fill parent dimensions
        this.layoutW = 1;
        this.layoutH = 1;

        this.gridContainer.x = this._trackHeaderWidth_px;
        this.gridContainer.w = -this._trackHeaderWidth_px;
        this.gridContainer.y = this._regionViewHeaderHeight_px;
        this.gridContainer.h = -this._regionViewHeaderHeight_px;
        this.gridContainer.layoutW = 1;
        this.gridContainer.layoutH = 1;

        this.add(this.gridContainer);

        let trackHeaderContainer = new Object2D();
        trackHeaderContainer.w = this._trackHeaderWidth_px;
        trackHeaderContainer.y = this._regionViewHeaderHeight_px;
        trackHeaderContainer.x = this.gridLayoutOptions.spacingAbsolute.x * 0.5;
        this.add(trackHeaderContainer);

        let trackHeaders = new Array<Object2D>();

        /**/
        // cell = grid[column][row]
        let grid = new Array<Array<Object2D>>();

        let scene = null;
        let paddingXPx = 1;
        let paddingYPx = 1;

        let nColumns = this.regionViews.length;
        let nRows = this.tracks.length;

        // create track header objects
        for (let r = 0; r < nRows; r++) {
            let track = this.tracks[r];
            let trackHeader = new ReactObject(this.trackHeaderElement({ name: track.name }), 0, 0);
            trackHeaders[r] = trackHeader;
            trackHeaderContainer.add(trackHeader);
        }

        // fill the grid cells up with some rects
        for (let c = 0; c < nColumns; c++) {
            let col = new Array<Object2D>(nRows);
            grid[c] = col;
            for (let r = 0; r < nRows; r++) {
                let cell = new Object2D();
                col[r] = cell;
                this.gridContainer.add(cell);

                // add rect for visibility
                let rect = new Rect(0, 0, [c / nColumns, r / nRows, 0., 1.]);
                rect.layoutW = 1;
                rect.layoutH = 1;
                cell.add(rect);

                if (r === 0) {
                    let regionView = this.regionViews[c];
                    let regionViewHeader = new ReactObject(this.regionViewHeaderElement({ name: regionView.name }), 0, 0);
                    regionViewHeader.layoutW = 1;
                    regionViewHeader.h = this._regionViewHeaderHeight_px;
                    regionViewHeader.layoutY = -1;
                    regionViewHeader.y = -this.gridLayoutOptions.spacingAbsolute.y * 0.5;
                    cell.add(regionViewHeader);
                }
            }
        }

        for (let c = 0; c < nColumns + 1; c++) this.edges.vertical[c] = c / nColumns;
        for (let r = 0; r < nRows + 1; r++) this.edges.horizontal[r] = r * 100;

        let layout = () => {
            // layout track headers
            GridLayout.layoutGridCells(
                [trackHeaders],
                {
                    vertical: [0, this._trackHeaderWidth_px],
                    horizontal: this.edges.horizontal,
                },
                {
                    layoutVerticalRelative: false,
                    layoutHorizontalRelative: false,
                    spacingAbsolute: {
                        x: 0,
                        y: this.gridLayoutOptions.spacingAbsolute.y
                    },
                    spacingRelative: {x: 0, y: 0},
                }
            );

            GridLayout.layoutGridCells(grid, this.edges, this.gridLayoutOptions);
        }
       
        (window as any).removeCol = (i: number) => {
            let col = grid[i];
            if (col != null) {
                for (let i = 0; i < col.length; i++) {
                    this.gridContainer.remove(col[i]);
                }
                grid.splice(i, 1);
            }

            GridLayout.removeColumnSpaceFill(this.edges.vertical, i);
            
            layout();
        }

        layout();
        /**/
    }

    trackHeaderElement(props: {
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

    regionViewHeaderElement(props: {
        name: string
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