import { Feature } from "../../../lib/sirius/SiriusApi";
import UsageCache from "../../ds/UsageCache";
import { AnnotationStore } from "../../model/AnnotationStore";
import SharedTileStore from "../../model/SharedTileStores";
import { Tile, TileState } from "../../model/TileStore";
import TrackDataModel, { TrackType } from "../../model/TrackDataModel";
import Object2D from "../core/Object2D";
import { Rect } from "../core/Rect";
import Track from "./Track";
import Text from "../core/Text";
import { BlendMode } from "../../rendering/Renderer";

const OpenSansRegular = require('../font/OpenSans-Regular.msdf.bin');

export class AnnotationTrack extends Track {

    protected annotationStore: AnnotationStore;

    constructor(model: TrackDataModel) {
        super(model);
        this.annotationStore = SharedTileStore[TrackType.Annotation][model.sequenceId];
        
        this.color.set([0.1, 0.1, 0.1, 1]);
    }

    setRange(x0: number, x1: number) {
        super.setRange(x0, x1);
        this.updateAnnotations();
    }

    private _lastComputedWidth: number;
    applyTransformToSubNodes(root?: boolean) {
        // update tiles if we need to
        if (this._lastComputedWidth !== this.getComputedWidth()) {
            this.updateAnnotations();
            this._lastComputedWidth = this.getComputedWidth();
        }

        super.applyTransformToSubNodes(root);
    }

    protected _annotationCache = new UsageCache<Annotation>();
    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected updateAnnotations() {
        this._pendingTiles.markAllUnused();
        this._annotationCache.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        if (widthPx > 0) {
            this.annotationStore.getTiles(x0, x1, 1, true, (tile) => {
                if (tile.state === TileState.Complete) {

                    // display annotations with span
                    for (let feature of tile.payload) {
                        // determine if feature is visible
                        let fx0 = feature.start - 1;
                        let fx1 = feature.end - 1;
                        let inRange = fx0 <= x1 && fx1 >= x0;
                        if (!inRange) continue;

                        // create / update annotation
                        let annotationKey = this.annotationKey(feature);
                        let annotation = this._annotationCache.use(annotationKey, () => this.createAnnotation(feature));
                        annotation.layoutParentX = (fx0 - x0) / span;
                        annotation.layoutW = (fx1 - fx0) / span;
                        annotation.y = 40;
                        annotation.layoutH = 0;
                        annotation.h = 40;
                    }

                } else {
                    this._pendingTiles.use(tile.key, () => this.createTileDependency(tile));
                }
            });
        }

        this._pendingTiles.removeUnused(this.deleteTileDependency);
        this._annotationCache.removeUnused(this.deleteAnnotation);
    }

    protected createAnnotation = (feature: Feature): Annotation => {
        let annotation = new Annotation(feature);
        annotation.mask = this;
        annotation.forEachSubNode((sub) => {
            sub.mask = this;
        });
        this.add(annotation);
        return annotation;
    }

    protected deleteAnnotation = (annotation: Annotation) => {
        this.remove(annotation);
        annotation.releaseGPUResources();
    }

    protected annotationKey = (feature: Feature) => {
        return feature.type + '\x1F' + feature.name + '\x1F' + feature.start + '\x1F' + feature.end;
    }

    // when we're waiting on data from a tile we add a complete listener to update the annotation when the data arrives
    protected createTileDependency = (tile: Tile<any>) => {
        console.log('createTileDependency');
        tile.addEventListener('complete', this.onDependentTileComplete);
        return tile;
    }

    protected deleteTileDependency = (tile: Tile<any>) => {
        console.log('deleteTileDependency');
        tile.removeEventListener('complete', this.onDependentTileComplete);
    }

    protected onDependentTileComplete = () => {
        this.updateAnnotations();
    }

}

class Annotation extends Object2D {

    constructor(protected readonly feature: Feature) {
        super();

        let fx0 = feature.start - 1;
        let fx1 = feature.end - 1;
        let fSpan = fx1 - fx0;

        let displayChildren = true;

        switch (feature.type) {
            // top-level
            case 'gene':
            case 'ncRNA_gene':
            case 'pseudogene': {
                let suffix = null;
                switch (feature.type) {
                    case 'ncRNA_gene': suffix = '(non-coding)'; break;
                    case 'pseudogene': suffix = '(pseudo)'; break;
                }

                let title = feature.name + (suffix !== null ? (' ' + suffix) : '');

                let name = new Text(OpenSansRegular, title, 16, [1, 1, 1, 1]);
                name.layoutY = -1;
                name.y = -5;
                this.add(name);

                let rect = new Rect(0, 0, [1, 0, 0, 0.5]);
                rect.transparent = true;
                rect.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
                rect.layoutW = 1;
                rect.layoutH = 0.1;
                this.add(rect);
                break;
            }

            case 'mRNA':
            case 'lnc_RNA':
            case 'pseudogenic_transcript': 
            case 'snRNA': case 'miRNA': {
                this.layoutY = -0.5;
                this.layoutParentY = 0.5;
                this.layoutH = 0.8;

                let name = new Text(OpenSansRegular, `${feature.name} (${feature.type})`, 10, [1, 1, 1, 1]);
                name.layoutY = -0.5;
                name.layoutX = -1;
                name.x = -10;
                name.layoutParentY = 0.5;
                this.add(name);

                let rect = new Rect(0, 0, [0, 1, 0, 0.2]);
                rect.transparent = true;
                rect.blendMode = BlendMode.PREMULTIPLIED_ALPHA; 
                rect.layoutW = 1;
                rect.layoutH = 1;    
                this.add(rect);

                break;
            }

            case 'exon': {
                this.layoutY = -0.5;
                this.layoutParentY = 0.5;
                this.layoutH = 0.8;

                /*
                let name = new Text(OpenSansRegular, 'e', 10, [1, 1, 1, 1]);
                name.layoutX = -0.5;
                name.layoutParentX = 0.5;
                name.layoutY = -0.5;
                name.layoutParentY = 0.5;
                this.add(name);
                */

                let rect = new Rect(0, 0, [0, 0, 1, 1], true);
                rect.layoutW = 1;
                rect.layoutH = 1;
                this.add(rect);
                
                break;
            }

            case 'CDS': {
                this.layoutY = -0.5;
                this.layoutParentY = 0.5;
                this.layoutH = 0.8;

                let rect = new Rect(0, 0, [1, 1, 0, 0.5], true);
                rect.transparent = true;
                rect.blendMode = BlendMode.PREMULTIPLIED_ALPHA; 
                rect.layoutW = 1;
                rect.layoutH = 1;
                rect.z += 0.1;
                this.add(rect);   
            }

            case 'three_prime_UTR':
            case 'five_prime_UTR': {
                this.layoutY = -0.5;
                this.layoutParentY = 0.5;
                this.layoutH = 0.8;

                let rect = new Rect(0, 0, [0.3, 0.3, 0.3, 1.0]);
                rect.layoutW = 1;
                rect.layoutH = 1;
                this.add(rect);
                break;
            }

            default: {
                console.warn(`Unknown type "${feature.type}" (name: ${feature.name}, children: ${feature.children.length})`);
                displayChildren = false;
                break;
            }
        }

        if (displayChildren) {
            let transcriptIndex = 0;

            for (let child of feature.children) {
                let cx0 = child.start - 1;
                let cx1 = child.end - 1;
                let cSpan = cx1 - cx0;

                let isTranscript =
                    child.type === 'mRNA' ||
                    child.type === 'lnc_RNA' ||
                    child.type === 'pseudogenic_transcript';

                let subAnnotation = new Annotation(child);

                subAnnotation.layoutParentX = (cx0 - fx0)/fSpan;
                subAnnotation.layoutW = (cx1 - cx0)/fSpan;

                if (isTranscript) {
                    subAnnotation.y = transcriptIndex * 40;
                    transcriptIndex++;
                }
                
                this.add(subAnnotation);
            }
        }
    }

}

/*
class AnnotationTile extends TileNode<TilePayload> {

    allocateGPUResources(device: Device) {
        // static initializations
        this.gpuVertexState = SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            AnnotationTile.vertexShader,
            AnnotationTile.fragmentShader,
            ['position']
        );
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
    }

    draw(context: DrawContext) {
        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.draw(DrawMode.TRIANGLES, 6, 0);
    }

    protected static vertexShader = `
        #version 100

        attribute vec2 position;
        uniform mat4 model;
        uniform vec2 size;

        varying vec2 vUv;

        void main() {
            vUv = position;
            gl_Position = model * vec4(position * size, 0., 1.0);
        }
    `;

    protected static fragmentShader = `
        precision mediump float;

        varying vec2 vUv;

        void main() {
            gl_FragColor = vec4(vUv, 0., 1.);
        }
    `;

}
*/

export default AnnotationTrack;