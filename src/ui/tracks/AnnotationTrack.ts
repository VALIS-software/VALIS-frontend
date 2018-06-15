import { Strand } from "../../../lib/gff3/Strand";
import { GeneClass, TranscriptClass, TranscriptComponentClass } from "../../../lib/sirius/AnnotationTileset";
import { Animator } from "../../animation/Animator";
import App from "../../App";
import UsageCache from "../../ds/UsageCache";
import { AnnotationTileStore, Gene, Transcript } from "../../model/data-store/AnnotationTileStore";
import SharedTileStore from "../../model/data-store/SharedTileStores";
import { Tile, TileState } from "../../model/data-store/TileStore";
import TrackModel from "../../model/TrackModel";
import { BlendMode } from "../../rendering/Renderer";
import Object2D from "../core/Object2D";
import { Rect } from "../core/Rect";
import Text from "../core/Text";
import { OpenSansRegular } from "../font/Fonts";
import Track from "./Track";

export class AnnotationTrack extends Track<'annotation'> {

    protected annotationStore: AnnotationTileStore;
    protected yScrollNode: Object2D;
    protected annotationsNeedUpdate: boolean = true;

    protected loadingIndicator: LoadingIndicator;

    constructor(model: TrackModel<'annotation'>) {
        super(model);
        
        this.annotationStore = SharedTileStore['annotation'][model.sequenceId] as AnnotationTileStore;

        this.yScrollNode = new Object2D();
        this.yScrollNode.z = 0;
        this.yScrollNode.layoutW = 1;
        this.add(this.yScrollNode);
        
        this.color.set([0.1, 0.1, 0.1, 1]);

        this.initializeYScrolling();

        this.loadingIndicator = new LoadingIndicator();
        this.loadingIndicator.cursorStyle = 'pointer';
        this.loadingIndicator.layoutY = -1;
        this.loadingIndicator.layoutParentY = 1;
        this.loadingIndicator.x = 10;
        this.loadingIndicator.y = -10;
        // @! depth-box, should be at top, maybe layoutParentZ = 1
        // - be careful to avoid conflict with cursor
        this.toggleLoadingIndicator(false, false);
        this.add(this.loadingIndicator);
    }

    setRange(x0: number, x1: number) {
        super.setRange(x0, x1);
        this.annotationsNeedUpdate = true;
    }

    private _lastComputedWidth: number;
    applyTransformToSubNodes(root?: boolean) {
        // update tiles if we need to
        if ((this._lastComputedWidth !== this.getComputedWidth()) || this.annotationsNeedUpdate) {
            this.updateAnnotations();
            this._lastComputedWidth = this.getComputedWidth();
        }

        super.applyTransformToSubNodes(root);
    }

    protected initializeYScrolling() {
        // scroll follows the primary pointer only
        let pointerY0 = 0;
        let scrollY0 = 0;
        
        this.addInteractionListener('dragstart', (e) => {
            if (!e.isPrimary) return;
            pointerY0 = e.localY;
            scrollY0 = this.yScrollNode.y;
        });

        this.addInteractionListener('dragmove', (e) => {
            if (!e.isPrimary) return;
            let dy = pointerY0 - e.localY;
            this.yScrollNode.y = Math.min(scrollY0 - dy, 0);
        });
    }

    /**
     * Show or hide the loading indicator via animation
     * Can be safely called repeatedly without accounting for the current state of the indicator
     */
    protected toggleLoadingIndicator(visible: boolean, animate: boolean) {
        // we want a little bit of delay before the animation, for this we use a negative opacity when invisible
        let targetOpacity = visible ? 1 : -0.1;

        if (animate) {
            Animator.springTo(this.loadingIndicator, { 'opacity': targetOpacity }, 50);
        } else {
            Animator.stop(this.loadingIndicator, ['opacity']);
            this.loadingIndicator.opacity = targetOpacity;
        }
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
                        // @! temp performance hack, only use node when visible
                        { if (!(gene.startIndex <= x1 && (gene.startIndex + gene.length) >= x0)) continue; }

                        // @! only show mRNAs
                        // if (gene.class !== GeneClass.ProteinCoding) continue;
                        // @! only show + strand
                        if (gene.strand !== this.model.strand) continue;

                        let annotationKey = this.annotationKey(gene);

                        let annotation = this._annotationCache.use(annotationKey, () => {
                            let object = new GeneAnnotation(gene);
                            object.y = 40;
                            object.layoutH = 0;
                            object.z = 1 / 4;
                            this.addAnnotation(object);
                            return object;
                        });

                        annotation.layoutParentX = (gene.startIndex - x0) / span;
                        annotation.layoutW = (gene.length) / span;
                    }

                } else {
                    this._pendingTiles.use(tile.key, () => this.createTileLoadingDependency(tile));
                }
            });
        }

        this._pendingTiles.removeUnused(this.deleteTileLoadingDependency);
        this._annotationCache.removeUnused(this.deleteAnnotation);
        this.annotationsNeedUpdate = false;

        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
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

    protected annotationKey = (feature: {
        soClass: string | number,
        name?: string,
        startIndex: number,
        length: number,
    }) => {
        return feature.soClass + '\x1F' + feature.name + '\x1F' + feature.startIndex + '\x1F' + feature.length;
    }

    // when we're waiting on data from a tile we add a complete listener to update the annotation when the data arrives
    protected createTileLoadingDependency = (tile: Tile<any>) => {
        tile.addEventListener('complete', this.onDependentTileComplete);
        return tile;
    }

    protected deleteTileLoadingDependency = (tile: Tile<any>) => {
        tile.removeEventListener('complete', this.onDependentTileComplete);
    }

    protected onDependentTileComplete = () => {
        this.updateAnnotations();
    }

}

class LoadingIndicator extends Text {

    set opacity(v: number) {
        this.color[3] = v;
        this.visible = v > 0;
    }

    get opacity() {
        return this.color[3];
    }

    constructor() {
        super(OpenSansRegular, 'Loading', 12, [1, 1, 1, 1]);
    }

}

class GeneAnnotation extends Object2D {

    constructor(protected readonly gene: Gene) {
        super();

        let colors = {
            [GeneClass.ProteinCoding]: [1, 0, 0, 0.5],
            [GeneClass.NonProteinCoding]: [0, 0, 1, 0.5],
            [GeneClass.Unspecified]: [1, 1, 1, 0.5],
            [GeneClass.Pseudo]: [0, 1, 1, 0.5],
        };

        let spanMarker = new Rect(0, 0, [1, 0, 0, 0.5], false);
        spanMarker.color.set(colors[gene.class]);
        spanMarker.layoutW = 1;
        spanMarker.h = 2.5;
        spanMarker.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
        spanMarker.transparent = true;
        this.add(spanMarker);
        
        let strandPrefix = '?';
        if (gene.strand === Strand.Positive) {
            strandPrefix = '>';
        } else if (gene.strand === Strand.Negative) {
            strandPrefix = '<';
        }

        let name = new Text(OpenSansRegular, strandPrefix + ' ' + gene.name, 16, [1, 1, 1, 1]);
        name.layoutY = -1;
        name.y = -5;
        this.add(name);

        let transcriptOffset = 10;
        let transcriptHeight = 20;
        let transcriptSpacing = 10;
        
        for (let i = 0; i < gene.transcripts.length; i++) {
            let transcript = gene.transcripts[i];

            let transcriptAnnotation = new TranscriptAnnotation(transcript, gene.strand);
            transcriptAnnotation.h = transcriptHeight;
            transcriptAnnotation.y = i * (transcriptHeight + transcriptSpacing) + transcriptOffset;

            transcriptAnnotation.layoutParentX = (transcript.startIndex - gene.startIndex) / gene.length;
            transcriptAnnotation.layoutW = transcript.length / gene.length;

            this.add(transcriptAnnotation);
        }
    }

}

class TranscriptAnnotation extends Object2D {

    constructor(protected readonly transcript: Transcript, strand: Strand) {
        super();

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
        spanMarker.transparent = true;
        spanMarker.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
        this.add(spanMarker);
        
        /*
        let strandSymbol = '?';
        if (strand === Strand.Positive) {
            strandSymbol = '>';
        } else if (strand === Strand.Negative) {
            strandSymbol = '<';
        }
        let name = new Text(OpenSansRegular, strandSymbol, 10, [1, 1, 1, 1]);
        name.layoutX = -1;
        name.x = -5;
        name.layoutY = -0.5;
        name.layoutParentY = 0.5;
        this.add(name);
        */

        let componentColor = {
            [TranscriptComponentClass.Exon]: [1, 0, 0, .5],
            [TranscriptComponentClass.ProteinCodingSequence]: [1, 1, 0, .85],
            [TranscriptComponentClass.Untranslated]: [0.5, 0.5, 0.5, 1.0],
        }

        let componentZ = {
            [TranscriptComponentClass.Exon]: 0.25,
            [TranscriptComponentClass.ProteinCodingSequence]: 1,
            [TranscriptComponentClass.Untranslated]: 0.5,
        }

        let componentH = {
            [TranscriptComponentClass.Exon]: 1,
            [TranscriptComponentClass.ProteinCodingSequence]: 0.5,
            [TranscriptComponentClass.Untranslated]: 0.5,
        }

        for (let component of transcript.components) {
            let componentMarker = new Rect(0, 0, undefined, false);
            componentMarker.layoutH = componentH[component.class];
            componentMarker.layoutParentX = (component.startIndex - transcript.startIndex) / transcript.length;
            componentMarker.layoutW = component.length / transcript.length;
            componentMarker.color.set(componentColor[component.class]);
            componentMarker.z = componentZ[component.class];

            componentMarker.transparent = true;
            componentMarker.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
            
            this.add(componentMarker);
        }
    }

}

export default AnnotationTrack;