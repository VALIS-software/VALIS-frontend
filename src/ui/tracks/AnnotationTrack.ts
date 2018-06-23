import { Strand } from "../../../lib/gff3/Strand";
import { TranscriptClass } from "../../../lib/sirius/AnnotationTileset";
import { Animator } from "../../animation/Animator";
import UsageCache from "../../ds/UsageCache";
import { Scalar } from "../../math/Scalar";
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

export class AnnotationTrack extends Track<'annotation'> {

    readonly macroLodThresholdLow = 8;
    readonly macroLodBlendRange = 2;

    protected annotationStore: AnnotationTileStore;
    protected macroAnnotationStore: AnnotationTileStore;
    protected yScrollNode: Object2D;
    protected annotationsNeedUpdate: boolean = true;

    protected loadingIndicator: LoadingIndicator;

    constructor(model: TrackModel<'annotation'>) {
        super(model);
        
        this.annotationStore = SharedTileStore.annotation[model.sequenceId];
        this.macroAnnotationStore = SharedTileStore.macroAnnotation[model.sequenceId];

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
     * This function can be safely called repeatedly without accounting for the current state of the indicator
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
    protected _activeAnnotations = new UsageCache<Object2D>();
    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected updateAnnotations() {
        this._pendingTiles.markAllUnused();
        this._activeAnnotations.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            let macroOpacity: number = Scalar.clamp((continuousLodLevel - this.macroLodThresholdLow) / this.macroLodBlendRange, 0, 1);
            let microOpacity: number = 1.0 - macroOpacity;
            
            if (microOpacity > 0) {
                this.updateMicroAnnotations(x0, x1, span, basePairsPerDOMPixel, microOpacity);
            }

            if (macroOpacity > 0) {
                this.macroAnnotationStore.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                    if (tile.state !== TileState.Complete) {
                        // if the tile is incomplete then wait until complete and call updateAnnotations() again
                        this._pendingTiles.use(tile.key, () => this.createTileLoadingDependency(tile));
                        return;
                    }

                    for (let gene of tile.payload) {
                        { if (!(gene.startIndex <= x1 && (gene.startIndex + gene.length) >= x0)) continue; }
                        if (gene.strand !== this.model.strand) continue;

                        let annotationKey = 'macro' + '\x1F' + this.annotationKey(gene);

                        let annotation = this._annotationCache.use(annotationKey, () => {
                            // create
                            let object = new Rect(0, 0);
                            object.color.set([82 / 255, 75 / 255, 165 / 255, 0.3]);
                            object.transparent = true;
                            object.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
                            object.y = 0;
                            object.layoutH = 0;
                            object.h = gene.transcriptCount * 20 + (gene.transcriptCount - 1) * 10 + 60;
                            object.z = 0.75;
                            object.mask = this;
                            object.forEachSubNode((sub) => sub.mask = this);
                            return object;
                        });

                        this._activeAnnotations.use(annotationKey, () => {
                            this.addAnnotation(annotation);
                            return annotation;
                        });

                        annotation.layoutParentX = (gene.startIndex - x0) / span;
                        annotation.layoutW = (gene.length) / span;
                        annotation.opacity = macroOpacity;
                    }
                });
            }
        }

        this._pendingTiles.removeUnused(this.deleteTileLoadingDependency);
        this._activeAnnotations.removeUnused(this.removeAnnotation);
        this.annotationsNeedUpdate = false;

        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
    }

    protected updateMicroAnnotations(x0: number, x1: number, span: number, samplingDensity: number, opacity: number) {
        this.annotationStore.getTiles(x0, x1, samplingDensity, true, (tile) => {
            if (tile.state !== TileState.Complete) {
                // if the tile is incomplete then wait until complete and call updateAnnotations() again
                this._pendingTiles.use(tile.key, () => this.createTileLoadingDependency(tile));
                return;
            }
        
            for (let gene of tile.payload) {
                // @! temp performance hack, only use node when visible
                // (don't need to do this when using instancing)
                { if (!(gene.startIndex <= x1 && (gene.startIndex + gene.length) >= x0)) continue; }

                // apply gene filter
                if (gene.strand !== this.model.strand) continue;

                let annotationKey = this.annotationKey(gene);

                let annotation = this._annotationCache.use(annotationKey, () => {
                    // create
                    let object = new GeneAnnotation(gene);
                    object.y = 40;
                    object.layoutH = 0;
                    object.z = 1 / 4;
                    object.mask = this;
                    object.forEachSubNode((sub) => sub.mask = this);
                    return object;
                });

                this._activeAnnotations.use(annotationKey, () => {
                    this.addAnnotation(annotation);
                    return annotation;
                });

                annotation.layoutParentX = (gene.startIndex - x0) / span;
                annotation.layoutW = (gene.length) / span;
                annotation.opacity = opacity;
            }
        });
    }

    protected createGeneAnnotation = (gene: Gene) => {
        return new GeneAnnotation(gene);
    }

    protected addAnnotation = (annotation: Object2D) => {
        // mask to this object
        this.yScrollNode.add(annotation);
    }

    protected removeAnnotation = (annotation: Object2D) => {
        // mask to this object
        this.yScrollNode.remove(annotation);
    }

    protected deleteAnnotation = (annotation: Object2D) => {
        annotation.releaseGPUResources();
        annotation.forEachSubNode((sub) => {
            sub.releaseGPUResources();
        });
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

    constructor() {
        super(OpenSansRegular, 'Loading', 12, [1, 1, 1, 1]);
    }

}

class GeneAnnotation extends Object2D {

    set opacity(v: number) {
        this._opacity = v;
        for (let child of this.children) {
            child.opacity = v;
        }
    }
    get opacity() {
        return this._opacity;
    }

    protected _opacity: number = 1;

    constructor(protected readonly gene: Gene) {
        super();

        let spanMarker = new TranscriptSpan(gene.strand);
        spanMarker.color.set([138 / 0xFF, 136 / 0xFF, 191 / 0xFF, 0.38]);
        spanMarker.layoutW = 1;
        spanMarker.h = 10;
        spanMarker.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
        spanMarker.transparent = true;
        this.add(spanMarker);

        devColorFromElement('gene', spanMarker.color);
        
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

    set opacity(v: number) {
        this._opacity = v;
        for (let child of this.children) {
            child.opacity = v;
        }
    }
    get opacity() {
        return this._opacity;
    }

    protected _opacity: number = 1;

    constructor(protected readonly transcript: Transcript, strand: Strand) {
        super();

        let transcriptColor = {
            [TranscriptClass.Unspecified]: [0.5, 0.5, 0.5, 0.25],
            [TranscriptClass.ProteinCoding]: [1, 0, 1, 0.25],
            [TranscriptClass.NonProteinCoding]: [0, 1, 1, 0.25],
        }

        /**
        let spanMarker = new TranscriptSpan(strand);
        spanMarker.color.set([138 / 0xFF, 136 / 0xFF, 191 / 0xFF, 0.38]);
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

        this.color.set([255, 255, 255].map(v => v / 255));
        this.color[3] = 0.1;

        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;

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
                const float borderStrength = 0.3;

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;

                vec4 c = color;
                c.rgb += (1.0 - border) * vec3(borderStrength);

                gl_FragColor = vec4(c.rgb, 1.0) * c.a;
            }
        `;
    }

}

class UTR extends Rect {

    constructor() {
        super(0, 0);

        this.color.set([216., 231., 255.].map(v => v / 255));
        this.color[3] = 0.1;

        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;

        devColorFromElement('utr', this.color);
    }

    draw(context: DrawContext) {
        context.uniform1f('pixelRatio', this.worldTransformMat4[0] * context.viewport.w * 0.5);
        super.draw(context);
    }

    getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 size;
            uniform vec4 color;
            uniform float pixelRatio;

            varying vec2 vUv;
            
            void main() {
                vec2 domPx = vUv * size;
            
                const vec2 borderWidthPx = vec2(1.);

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = inner.x * inner.y;

                // crosshatch
                const float angle = -0.520;
                const float widthPx = 2.;
                const float wavelengthPx = 7.584;
                const float lineStrength = 0.25;
                
                vec2 centerPx = domPx - size * 0.5;

                float lPx = centerPx.x * cos(angle) - centerPx.y * sin(angle);
                // not antialiased but looks good enough with current color scheme
                float lines = step(widthPx, mod(lPx, wavelengthPx)) * lineStrength + (1. - lineStrength);

                vec4 c = color;
                c.rgb += (1.0 - border * lines) * vec3(0.3);

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

        let defaultStartTone = phase > 0 ? 1 : 0;

        // we determine which 'tone' the first codon is by its position in the mRNA sequence (after splicing)
        let startTone = Math.floor(mRnaIndex / 3) % 2; // 0 = A, 1 = B

        // if necessary swap start tone by offsetting phase
        if (defaultStartTone !== startTone) {
            this.phase += 3;
        }
        
        this.reverse = strand === Strand.Negative ? 1.0 : 0.0;

        this.color.set([228, 25, 255].map(v => v/255));
        this.color[3] = 0.5;

        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;

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

            float squareWaveIntegral(in float x, in float wavelength) {
                float k = x / wavelength;
                float u = fract(k);
                float wave = step(0.5, u) * 2.0 - 1.0;
                return (fract(k * wave) - 1.) * wavelength;
            }

            float squareWaveAntialiased(in float xPixels, in float wavelengthPixels) {
                // antialiasing: we find the average over the pixel by sampling signal integral either side and dividing by sampling interval (1 in this case)
                float waveAvg = squareWaveIntegral(xPixels + 0.5, wavelengthPixels) - squareWaveIntegral(xPixels - 0.5, wavelengthPixels);

                // lerp to midpoint (0) for small wavelengths (~ 1 pixel) to avoid moire patterns
                waveAvg = mix(waveAvg, 0., clamp(2. - wavelengthPixels, 0., 1.0));
                return waveAvg;
            }
            
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

                // use square wave to create codon tones
                // we use true pixel coordinates to make antialiasing easier
                float xPixels = (mix(domPx.x, size.x - domPx.x, reverse) - baseWidthPx * phase) * pixelRatio;
                float wavelengthPixels = codonWidthPx * pixelRatio * 2.0;

                float codon = squareWaveAntialiased(xPixels, wavelengthPixels) * 0.5 + 0.5; // scale wave to 0 - 1

                vec4 c =
                    mix(codonAColor, codonBColor, codon); // switch between codon colors

                c.rgb += (1.0 - border) * vec3(0.3); // additive blend border

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
        context.uniform1f('reverse', this.direction === Strand.Negative ? 1 : 0);
        super.draw(context);
    }

    protected getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform vec2 pixelSize;
            uniform vec2 size;
            uniform float reverse;

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

                x.x = mix(x.x, 1.0 - x.x, reverse);

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

                vec3 rgb = color.rgb * m;
                float a = m * color.a;

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