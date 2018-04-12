import { Object2D } from "./core/Object2D";

class GridLayout {

    /**
     * cell = objects[column][row]
     * for a given index each edge corresponds to the _left_/_top_ of a column
     */
    static layoutGridCells(
        objects: Array<Array<{
            x: number,
            y: number,
            w: number,
            h: number,
            layoutX: number,
            layoutY: number,
            layoutW: number,
            layoutH: number,
            layoutParentX: number,
            layoutParentY: number,
        }>>,
        edges: {
            vertical: Array<number>,
            horizontal: Array<number>,
        },
        layoutOptions?: {
            layoutVerticalRelative: boolean,
            layoutHorizontalRelative: boolean,
            spacingAbsolute: {
                x: number,
                y: number,
            },
            spacingRelative: {
                x: number,
                y: number,
            }
        }
    ) {
        if (layoutOptions == null) {
            layoutOptions = {
                layoutVerticalRelative: false,
                layoutHorizontalRelative: false,
                spacingAbsolute: {x: 0, y: 0},
                spacingRelative: {x: 0, y: 0},
            }
        }

        let sa = layoutOptions.spacingAbsolute;
        let sr = layoutOptions.spacingRelative;

        for (let c = 0; c < objects.length; c++) {
            let col = objects[c];
            if (col == null) continue;
            for (let r = 0; r < col.length; r++) {
                let cell = col[r];
                if (cell == null) continue;

                let leftEdge = edges.vertical[c];
                let rightEdge = edges.vertical[c + 1];
                let topEdge = edges.horizontal[r];
                let bottomEdge = edges.horizontal[r + 1];

                if (layoutOptions.layoutVerticalRelative) {
                    cell.layoutW = (rightEdge - leftEdge) - sr.x;
                    cell.layoutParentX = leftEdge + sr.x * 0.5;
                    cell.x = sa.x * 0.5;
                    cell.w = -sa.x;
                } else {
                    cell.x = leftEdge + sa.x * 0.5;
                    cell.w = (rightEdge - leftEdge) - sa.x;
                    cell.layoutW = -sr.x;
                    cell.layoutParentX = sr.x * 0.5;
                }

                if (layoutOptions.layoutHorizontalRelative) {
                    cell.layoutH = (bottomEdge - topEdge) - sr.y;
                    cell.layoutParentY = topEdge + sr.y * 0.5;
                    cell.h = -sa.y;
                } else {
                    cell.y = topEdge + sa.y * 0.5;
                    cell.h = (bottomEdge - topEdge) - sa.y;
                    cell.layoutH = -sr.y;
                    cell.layoutParentY = sr.y * 0.5;
                }
            }
        }
    }

    /*
    static pushEdge(edges: Array<number>) {
        edges.push(1);

        // shrink edges to make space for a 1/N wide column
        let lSpan = 1;
        let newLSpan = 1 - (1 / edges.length);
        let lSpanMultiplier = newLSpan / lSpan;
        for (let e = 0; e < edges.length; e++) {
            edges[e] *= lSpanMultiplier;
        }
    }
    */

    static removeColumnSpaceFill(edges: Array<number>, index: number) {
        if (index >= edges.length || index < 0) return false;

        let leftmostEdge = edges[0];
        let rightmostEdge = edges[edges.length - 1];
        let leftEdge = edges[index];
        let rightEdge = edges[index + 1] || rightmostEdge;

        let lSpan = leftEdge - leftmostEdge;
        let rSpan = rightmostEdge - rightEdge;
        let totalSpan = rSpan + lSpan;

        // determine where the left and right edges should come together
        let relativeMergePoint = totalSpan == 0 ? 0.5 : (lSpan / totalSpan);
        let edgeMergeTarget = relativeMergePoint * (rightEdge - leftEdge) + leftEdge;

        // evenly redistribute all the edges ether side to fill the new space
        let newRSpan = rightmostEdge - edgeMergeTarget;
        let newLSpan = edgeMergeTarget - leftmostEdge;

        let rSpanMultiplier = rSpan == 0 ? 0 : newRSpan / rSpan;
        for (let i = index + 1; i < edges.length; i++) {
            edges[i] = edgeMergeTarget + (edges[i] - rightEdge) * rSpanMultiplier;
        }

        let lSpanMultiplier = newLSpan / lSpan;
        for (let i = 0; i < index; i++) {
            edges[i] = leftmostEdge + (edges[i] - leftmostEdge) * lSpanMultiplier;
        }

        // remove edge from list
        edges.splice(index, 1);

        return true;
    }

}

export default GridLayout;