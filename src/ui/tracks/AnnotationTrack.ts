import { Strand } from "../../../lib/gff3/Strand";
import { GeneClass, TranscriptClass, TranscriptComponentClass, TranscriptComponentInfo } from "../../../lib/sirius/AnnotationTileset";
import { Animator } from "../../animation/Animator";
import App from "../../App";
import UsageCache from "../../ds/UsageCache";
import { AnnotationTileStore, Gene, Transcript } from "../../model/data-store/AnnotationTileStore";
import SharedTileStore from "../../model/data-store/SharedTileStores";
import { Tile, TileState } from "../../model/data-store/TileStore";
import TrackModel from "../../model/TrackModel";
import { BlendMode, DrawContext } from "../../rendering/Renderer";
import Object2D from "../core/Object2D";
import { Rect } from "../core/Rect";
import Text from "../core/Text";
import { OpenSansRegular } from "../font/Fonts";
import Track from "./Track";
import { start } from "repl";

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

        /*
        let test = new TranscriptSpan(Strand.Negative);
        test.layoutW = 1;
        test.layoutH = 1;
        this.add(test);
        */
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

                        // apply gene filter
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

        /*
        let spanMarker = new Rect(0, 0);
        spanMarker.color.set(colors[gene.class]);
        spanMarker.layoutW = 1;
        spanMarker.h = 1;
        spanMarker.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
        spanMarker.transparent = true;
        this.add(spanMarker);
        */
        
        /*
        let strandIndication = '?';
        if (gene.strand === Strand.Positive) {
            strandIndication = '>';
        } else if (gene.strand === Strand.Negative) {
            strandIndication = '<';
        }
        */

        let name = new Text(OpenSansRegular, gene.name, 16, [1, 1, 1, 1]);
        name.layoutY = -1;
        name.y = -5;
        this.add(name);

        let transcriptOffset = 20;
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
            [TranscriptClass.ProteinCoding]: [1, 0, 1, 0.25],
            [TranscriptClass.NonProteinCoding]: [0, 1, 1, 0.25],
        }

        /**
        let spanMarker = new TranscriptSpan(strand);
        spanMarker.color.set(transcriptColor[transcript.class]);
        spanMarker.h = 10;
        spanMarker.layoutW = 1;
        spanMarker.layoutY = -0.5;
        spanMarker.layoutParentY = 0.5;
        spanMarker.z = 0.0;
        spanMarker.transparent = true;
        spanMarker.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
        this.add(spanMarker);
        /**/

        // create exons
        for (let exonInfo of transcript.exon) {
            let exon = new Exon();
            exon.z = 0.25;
            exon.layoutH = 1;
            exon.layoutParentX = (exonInfo.startIndex - transcript.startIndex) / transcript.length;
            exon.layoutW = exonInfo.length / transcript.length;
            this.add(exon);
        }

        // create untranslated regions
        for (let utrInfo of transcript.utr) {
            let utr = new UTR();
            utr.z = 0.5;
            utr.layoutH = 1;
            utr.layoutParentX = (utrInfo.startIndex - transcript.startIndex) / transcript.length;
            utr.layoutW = utrInfo.length / transcript.length;
            this.add(utr);
        }

        // create protein coding sequences
        // ! assuming CDS array is sorted from startIndex

        let reverse = strand === Strand.Negative;
        let mRnaIndex = 0; // track offset within RNA sequence after splicing
        for (let k = 0; k < transcript.cds.length; k++) {
            // if on negative strand, iterate in reverse
            let i = reverse ? ((transcript.cds.length - 1) - k) : k;

            let cdsInfo = transcript.cds[i];

            let cds = new CDS(cdsInfo.length, cdsInfo.phase, strand, mRnaIndex);

            cds.z = 0.75;
            cds.layoutH = 1;
            cds.layoutParentX = (cdsInfo.startIndex - transcript.startIndex) / transcript.length;
            cds.layoutW = cdsInfo.length / transcript.length;
            this.add(cds);

            mRnaIndex += cdsInfo.length;
        }

    }

}

//@! quick dev-time hack
function devColorFromElement(id: string, colorArray: Float32Array) {
    let target = document.getElementById(id);

    let updateColor = () => {
        let cssColor = target.style.color;
        let result = cssColor.match(/\w+\((\d+), (\d+), (\d+)(, ([\d.]+))?\)/);
        if (result == null) {
            console.warn('Could not parse css color', cssColor);
            return;
        }
        let rgb = result.slice(1, 4).map(v => parseFloat(v) / 255);
        let a = result[5] ? parseFloat(result[5]) : 1.0;
        colorArray.set(rgb);
        colorArray[3] = a;
    }

    updateColor();

    let observer = new MutationObserver((mutations) => mutations.forEach(updateColor));
    observer.observe(target, { attributes: true, attributeFilter: ['style'] });
}

class Exon extends Rect {

    constructor() {
        super(0, 0);

        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;

        this.color.set([255, 255, 255].map(v => v / 255));
        this.color[3] = 0.1;

        devColorFromElement('exon', this.color);
    }

    draw(context: DrawContext) {
        super.draw(context);
    }

    getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 size;

            uniform vec4 color;

            varying vec2 vUv;
            
            void main() {
                vec2 domPx = vUv * size;
            
                const vec2 borderWidthPx = vec2(1.);
                const float borderStrength = 0.2;

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;

                vec4 c = color + (1.0 - border) * vec4(borderStrength);

                gl_FragColor = vec4(c.rgb, 1.0) * c.a;
            }
        `;
    }

}

class UTR extends Rect {

    constructor() {
        super(0, 0);

        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;

        this.color.set([216., 231., 255.].map(v => v / 255));
        this.color[3] = 0.1;

        devColorFromElement('utr', this.color);
    }

    draw(context: DrawContext) {
        super.draw(context);
    }

    getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 size;

            uniform vec4 color;

            varying vec2 vUv;
            
            void main() {
                vec2 domPx = vUv * size;
            
                const vec2 borderWidthPx = vec2(1.);

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;


                // crosshatch
                // todo: anti-aliasing
                const float angle = -0.520;
                const float widthPx = 2.;
                const float wavelengthPx = 7.584;
                const float lineStrength = 0.25;
                
                vec2 centerPx = domPx - size * 0.5;
                float l = centerPx.x * cos(angle) - centerPx.y * sin(angle);
                float lines = step(widthPx, mod(l, wavelengthPx)) * lineStrength + (1. - lineStrength);


                vec4 c = color + (1.0 - border * lines) * vec4(0.2);

                gl_FragColor = vec4(c.rgb, 1.0) * c.a;
            }
        `;
    }

}

class CDS extends Rect {

    protected reverse: number;
    protected phase: number;

    constructor(
        protected length_bases: number,
        phase: number, // number of bases to substract from start to reach first complete codon
        strand: Strand,
        mRnaIndex: number,
    ) {
        super(0, 0);
        this.phase = phase;

        // we determine which 'tone' the first codon is by its position in the mRNA sequence (after splicing)
        let startTone = Math.floor(mRnaIndex / 3) % 2; // 0 = A, 1 = B

        // b
        let defaultStartTone = phase > 0 ? 1 : 0;

        if (defaultStartTone !== startTone) {
            this.phase += 3;
        }
        
        this.reverse = strand === Strand.Negative ? 1.0 : 0.0;

        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;

        this.color.set([228, 25, 255].map(v => v/255));
        this.color[3] = 0.5;

        devColorFromElement('cds', this.color);
    }

    draw(context: DrawContext) {
        context.uniform1f('baseWidthPx', (this.computedWidth / this.length_bases));
        context.uniform1f('phase', this.phase || 0);
        context.uniform1f('reverse', this.reverse);
        context.uniform1f('pixelRatio', this.worldTransformMat4[0] * context.viewport.w * 0.5);
        super.draw(context);
    }

    getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 size;

            uniform float pixelRatio;
            uniform float baseWidthPx;
            uniform float phase;
            uniform float reverse;

            uniform vec4 color;

            varying vec2 vUv;
            
            void main() {
                vec2 domPx = vUv * size;
            
                const vec2 borderWidthPx = vec2(1.);

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;

                // two-tones for codons
                vec4 codonAColor = color;
                vec4 codonBColor = color + vec4(0.05);
                // a codon is 3 bases wide
                float codonWidthPx = baseWidthPx * 3.0;
                
                // x-coordinate used to determine codon tone
                float wavelength = codonWidthPx * 2.0;
                float posX = mix(domPx.x, size.x - domPx.x, reverse);
                float codonU = fract((posX - baseWidthPx * phase) / wavelength);
                float codon = step(0.5, codonU);

                // wavelengthPixels = wavelength * pixelRatio
                // wavePhase at pixel center = codonU
                // pixel-coverage = f(wavelengthPixels, wavePhase)

                vec4 c =
                    mix(color, codonBColor, codon) // switch between codon colors
                    + (1.0 - border) * vec4(0.2); // additive blend border

                gl_FragColor = vec4(c.rgb, 1.0) * c.a;
            }
        `;
    }

}

class TranscriptSpan extends Rect {

    constructor(protected direction: Strand) {
        super(0, 0);

        this.color.set([0, 1, 0, 1]);
    }

    draw(context: DrawContext) {
        context.uniform2f('pixelSize', 1/context.viewport.w, 1/context.viewport.h);
        super.draw(context);
    }

    protected getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 pixelSize;
            uniform vec2 size;

            uniform vec4 color;

            varying vec2 vUv;

            float distanceToSegment(vec2 a, vec2 b, vec2 p) {
                p -= a; b -= a;                        // go to A referential
                float q = dot(p, b) / dot(b, b) ;      // projection of P on line AB: normalized ordinate
                b *= clamp(q, 0., 1.);                 // point on segment AB closest to P 
                return length( p - b);                 // distance to P
            }

            float lineSegment(vec2 x, vec2 a, vec2 b, float r, vec2 pixelSize) {
                float f = distanceToSegment(a, b, x);
                float e = pixelSize.x * 0.5;
                return smoothstep(r - e, r + e, f);
            }
            
            void main() {
                vec2 x = vec2(vUv.x, vUv.y - 0.5);

                float n = 2.0;
                x *= n; x.x = fract(x.x);

                vec2 p = x * size;

                float m = 1.0 - (
                    // arrow
                    lineSegment(
                        p + vec2(-size.x * 0.5, 0.0),
                        vec2(-10.0, -10.0) * 0.75,
                        vec2(  0.0,   0.0),
                        1.0,
                        pixelSize
                    ) *
                    lineSegment(
                        p + vec2(-size.x * 0.5, 0.0),
                        vec2(-10.0, 10.0) * 0.75,
                        vec2(  0.0,  0.0),
                        1.0,
                        pixelSize
                    ) *

                    // middle line
                    lineSegment(x, vec2(0), vec2(1.0, 0.), 0.1, pixelSize)
                );

                vec3 rgb = vec3(m);
                float a = m * 0.1;

                gl_FragColor = vec4(rgb, 1.0) * a; return;


                /*

                float h = 0.1;
                float l = lineSegment(
                    uv,
                    vec2(0.5 - w * 0.5,  0.5),
                    vec2(0.5 + w * 0.5,  0.5),
                    h,
                    pixelSize
                );

                gl_FragColor = vec4(0., 0., l, 1.); return;

                float r = size.x / size.y;
                
                vec2 x = vec2(vUv.x, vUv.y - 0.5);
                x.x *= r;
                x *= 1.0; x.x = fract(x.x);

                vec2 lx = vec2(x.x - 0.5, x.y);
                float lines = 1.0 - (
                    lineSegment(lx, vec2(-0.25,  0.25), vec2(0), 0.05, pixelSize) *
                    lineSegment(lx, vec2(-0.25, -0.25), vec2(0), 0.05, pixelSize)
                );

                // gl_FragColor = vec4(lx, 0., 1.); return;

                gl_FragColor = vec4(vec3(lines), 1.);
                */
            }
        `;
    }

}

export default AnnotationTrack;