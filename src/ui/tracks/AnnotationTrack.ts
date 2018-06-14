import { GeneClass, TranscriptClass, TranscriptComponentClass } from "../../../lib/sirius/AnnotationTileset";
import App from "../../App";
import UsageCache from "../../ds/UsageCache";
import { AnnotationStore, Gene, Transcript } from "../../model/AnnotationStore";
import SharedTileStore from "../../model/SharedTileStores";
import { Tile, TileState } from "../../model/TileStore";
import TrackDataModel, { TrackType } from "../../model/TrackDataModel";
import { BlendMode } from "../../rendering/Renderer";
import Object2D from "../core/Object2D";
import { Rect } from "../core/Rect";
import Text from "../core/Text";
import { OpenSansRegular } from "../font/Fonts";
import Track from "./Track";

export class AnnotationTrack extends Track {

    protected annotationStore: AnnotationStore;
    protected yScrollNode: Object2D;

    constructor(model: TrackDataModel) {
        super(model);
        this.annotationStore = SharedTileStore[TrackType.Annotation][model.sequenceId];

        this.yScrollNode = new Object2D();
        this.yScrollNode.z = 0;
        this.yScrollNode.layoutW = 1;
        this.add(this.yScrollNode);
        
        this.color.set([0.1, 0.1, 0.1, 1]);

        this.initializeYScrolling();
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

    protected initializeYScrolling() {
        let ey0 = 0;
        let scrollY0 = 0;
        
        this.addInteractionListener('dragstart', (e) => {
            ey0 = e.localY;
            scrollY0 = this.yScrollNode.y;
        });

        this.addInteractionListener('dragmove', (e) => {
            let dy = ey0 - e.localY;
            this.yScrollNode.y = Math.min(scrollY0 - dy, 0);
        });
    }

    protected _annotationCache = new UsageCache<Object2D>();
    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected updateAnnotations() {
        this._pendingTiles.markAllUnused();
        this._annotationCache.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);
            let samplingDensity = basePairsPerDOMPixel / App.canvasPixelRatio;

            this.annotationStore.getTiles(x0, x1, samplingDensity, true, (tile) => {
                if (tile.state === TileState.Complete) {
                    
                    for (let gene of tile.payload) {
                        { if (!(gene.startIndex <= x1 && gene.endIndex >= x0)) continue; }

                        let annotationKey = this.annotationKey(gene);

                        let annotation = this._annotationCache.use(annotationKey, () => {
                            let object = new GeneAnnotation(gene);
                            object.y = 40;
                            object.layoutH = 0;
                            object.h = 5;
                            object.z = 1 / 4;
                            this.addAnnotation(object);
                            return object;
                        });

                        annotation.layoutParentX = (gene.startIndex - x0) / span;
                        annotation.layoutW = (gene.endIndex - gene.startIndex) / span;
                    }

                } else {
                    this._pendingTiles.use(tile.key, () => this.createTileDependency(tile));
                }
            });
        }

        this._pendingTiles.removeUnused(this.deleteTileDependency);
        this._annotationCache.removeUnused(this.deleteAnnotation);
    }

    protected createGeneAnnotation = (gene: Gene) => {
        return new GeneAnnotation(gene);
    }

    protected addAnnotation = (annotation: Object2D) => {
        // mask to this object
        annotation.mask = this;
        annotation.forEachSubNode((sub) => {
            sub.mask = this;
        });
        this.yScrollNode.add(annotation);
    }

    protected deleteAnnotation = (annotation: Object2D) => {
        this.yScrollNode.remove(annotation);
        annotation.releaseGPUResources();
    }

    protected annotationKey = (feature: { soClass: string | number, name?: string, startIndex: number, endIndex: number }) => {
        return feature.soClass + '\x1F' + feature.name + '\x1F' + feature.startIndex + '\x1F' + feature.endIndex;
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

class GeneAnnotation extends Rect {

    constructor(protected readonly gene: Gene) {
        super(0, 0, [1, 0, 0, 0.5], false);
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
        this.transparent = true;

        let colors = {
            [GeneClass.ProteinCoding]: [1, 0, 0, 0.5],
            [GeneClass.NonProteinCoding]: [0, 0, 1, 0.5],
            [GeneClass.Unspecified]: [1, 1, 1, 0.5],
            [GeneClass.Pseudo]: [0, 1, 1, 0.5],
        };

        this.color.set(colors[gene.class]);

        let geneSpan = gene.endIndex - gene.startIndex;

        let name = new Text(OpenSansRegular, gene.name, 16, [1, 1, 1, 1]);
        name.layoutY = -1;
        name.y = -5;
        this.add(name);

        let transcriptOffset = 10;
        let transcriptHeight = 20;
        let transcriptSpacing = 10;
        
        for (let i = 0; i < gene.transcripts.length; i++) {
            let transcript = gene.transcripts[i];
            let transcriptAnnotation = new TranscriptAnnotation(transcript);
            transcriptAnnotation.h = transcriptHeight;
            transcriptAnnotation.y = i * (transcriptHeight + transcriptSpacing) + transcriptOffset;

            transcriptAnnotation.layoutParentX = (transcript.startIndex - gene.startIndex) / geneSpan;
            transcriptAnnotation.layoutW = (transcript.endIndex - transcript.startIndex) / geneSpan;

            this.add(transcriptAnnotation);
        }
    }

}

class TranscriptAnnotation extends Object2D {

    constructor(protected readonly transcript: Transcript) {
        super();

        let transcriptSpan = transcript.endIndex - transcript.startIndex;

        let transcriptColor = {
            [TranscriptClass.Unspecified]: [0.5, 0.5, 0.5, 0.25],
            [TranscriptClass.Messenger]: [1, 0, 1, 0.25],
            [TranscriptClass.NonProteinCoding]: [0, 1, 1, 0.25],
        }

        let spanMarker = new Rect(0, 0, undefined, false);
        spanMarker.color.set(transcriptColor[transcript.class]);
        spanMarker.h = 10;
        spanMarker.layoutW = 1;
        spanMarker.layoutY = -0.5;
        spanMarker.layoutParentY = 0.5;
        spanMarker.z = 0.0;
        this.add(spanMarker);
        
        let name = new Text(OpenSansRegular, transcript.name, 10, [1, 1, 1, 1]);
        this.add(name);

        let componentColor = {
            [TranscriptComponentClass.Exon]: [1, 0, 0, 1],
            [TranscriptComponentClass.ProteinCodingSequence]: [1, 1, 0, 1],
            [TranscriptComponentClass.Untranslated]: [0.5, 0.5, 0.5, 1],
        }

        let componentZ = {
            [TranscriptComponentClass.Exon]: 0.25,
            [TranscriptComponentClass.ProteinCodingSequence]: 1,
            [TranscriptComponentClass.Untranslated]: 0.5,
        }

        for (let component of transcript.components) {
            let componentMarker = new Rect(0, 0, undefined, false);
            componentMarker.layoutH = 1;
            componentMarker.layoutParentX = (component.startIndex - transcript.startIndex) / transcriptSpan;
            componentMarker.layoutW = (component.endIndex - component.startIndex) / transcriptSpan;
            componentMarker.color.set(componentColor[component.class]);
            componentMarker.z = componentZ[component.class];
            this.add(componentMarker);
        }
    }

}

export default AnnotationTrack;