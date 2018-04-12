import { Object2D } from "./core/Object2D";

class Grid {

    protected verticalEdges = new Array<number>();
    protected horizontalEdges = new Array<number>();

    constructor() {
    }

    /**
     * objects[column][row]
     */
    layoutObjects(objects: Array<Array<Object2D>>, spacingX: number = 0, spacingY: number = 0) {
        for (let c = 0; c < objects.length; c++) {
            let col = objects[c];
            if (col == null) continue;
            for (let r = 0; r < col.length; r++) {
                let cell = col[r];
                if (cell == null) continue;

                let leftEdge = c < 0 ? 0 : this.verticalEdges[c];
                let rightEdge = ((c + 1) >= this.verticalEdges.length) ? 1 : this.verticalEdges[c + 1];
                let topEdge = r < 0 ? 0 : this.horizontalEdges[r];
                let bottomEdge = ((r + 1) >= this.horizontalEdges.length) ? 1 : this.horizontalEdges[r + 1];

                cell.layoutW = rightEdge - leftEdge;
                cell.layoutX = -0.5;
                cell.layoutParentX = (rightEdge - leftEdge) * 0.5 + leftEdge;
                cell.w = -spacingX;

                cell.layoutH = bottomEdge - topEdge;
                cell.layoutY = -0.5;
                cell.layoutParentY = (bottomEdge - topEdge) * 0.5 + topEdge;
                cell.h = -spacingY;
            }
        }
    }

    pushColumn() {
        this.verticalEdges.push(1);

        // shrink edges to make space
        let lSpan = 1;
        let newLSpan = 1 - (1 / this.verticalEdges.length);
        let lSpanMultiplier = newLSpan / lSpan;
        for (let e = 0; e < this.verticalEdges.length; e++) {
            this.verticalEdges[e] *= lSpanMultiplier;
        }
    }

    pushRow() {
        this.horizontalEdges.push(1);

        // shrink edges to make space
        let lSpan = 1;
        let newLSpan = 1 - (1 / this.horizontalEdges.length);
        let lSpanMultiplier = newLSpan / lSpan;
        for (let e = 0; e < this.horizontalEdges.length; e++) {
            this.horizontalEdges[e] *= lSpanMultiplier;
        }
    }

    removeColumn(index: number) {
        return this.removeEdge(this.verticalEdges, index);;
    }

    removeRow(index: number) {
        return this.removeEdge(this.horizontalEdges, index);
    }

    protected removeEdge(edges: Array<number>, index: number) {
        if (index >= edges.length || index < 0) return false;

        let leftEdge = edges[index];
        let rightEdge = edges[index + 1] || 1;

        let rSpanLeftEdge = edges[index + 1] || 1;
        let rSpan = 1 - rSpanLeftEdge;
        let lSpan = edges[index];
        let totalSpan = rSpan + lSpan;

        // determine where the left and right edges should come together
        let edgeMergeTarget = (lSpan / totalSpan) * (rightEdge - leftEdge) + leftEdge;

        // evenly redistribute all the edges ether side to fill the new space
        let newRSpan = 1 - edgeMergeTarget;
        let newLSpan = edgeMergeTarget;

        let rSpanMultiplier = newRSpan / rSpan;
        for (let i = index + 1; i < edges.length; i++) {
            edges[i] = (edges[i] - rSpanLeftEdge) * rSpanMultiplier + edgeMergeTarget;
        }

        let lSpanMultiplier = newLSpan / lSpan;
        for (let i = 1; i < index; i++) {
            edges[i] *= lSpanMultiplier;
        }

        // remove edge from list
        edges.splice(index, 1);

        return true;
    }

}