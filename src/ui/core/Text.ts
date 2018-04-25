import { Device, GPUProgram, GPUVertexState, GPUBuffer, BufferUsageHint, VertexAttributeDataType } from "../../rendering/Device";
import { SharedResources } from "./SharedResources";
import { DrawContext, DrawMode } from "../../rendering/Renderer";
import { Object2D } from "./Object2D";
import GPUText, { GPUTextFont, GlyphLayout, ResourceReference } from "../../../lib/gputext/GPUText";
import { ReactObjectContainer } from "./ReactObject";

/**
 * Text
 * 
 * Todo:
 * - Glow and shadow
 * - Bake color into verticies
 * - Vertex index buffer
 */
export class Text extends Object2D {

    set string(v: string) {
        this._string = v;
        this.updateGlyphLayout();
    }
    get string() {
        return this._string;
    }

    set fontPath(v: string) {
        this._fontPath = v;
        this.updateFontPath();
    }
    get fontPath() {
        return this._fontPath;
    }

    color: Float32Array = new Float32Array([0, 0, 0, 1]);

    protected _fontPath: string;
    protected _fontAsset: FontAsset;

    protected _string: string;
    protected _glyphLayout: GlyphLayout;
    
    protected _kerningEnabled = true;
    protected _ligaturesEnabled = true;
    protected _lineHeight = 1.0;

    // additional vertex state
    protected gpuVertexBuffer: GPUBuffer;
    protected vertexCount = 0;

    //@! protected glyphAtlas: GPUTexture = null;

    constructor(fontPath?: string, string?: string) {
        super();
        // cannot allocate GPU resource until font asset is available
        this.gpuResourcesNeedAllocate = false;

        this.fontPath = fontPath;
        this.string = string;

    }

    allocateGPUResources(device: Device) {
        let programNeedsUpdate = false;

        if (this.gpuProgram == null || programNeedsUpdate) {
            this.gpuProgram = SharedResources.getProgram(
                device,
                `
                #version 100

                precision mediump float;

                attribute vec2 position;
                attribute vec3 uv;

                uniform mat4 transform;
                uniform float fieldRange;
                uniform vec2 viewportSize;

                varying vec2 vUv;
                varying float vFieldRangeDisplay_px;

                void main() {
                    vUv = uv.xy;

                    // determine the field range in pixels when drawn to the framebuffer
                    vec2 scale = abs(vec2(transform[0][0], transform[1][1]));
                    float atlasScale = uv.z;
                    vFieldRangeDisplay_px = fieldRange * scale.y * (viewportSize.y * 0.5) / atlasScale;
                    vFieldRangeDisplay_px = max(vFieldRangeDisplay_px, 1.0);

                    vec2 p = vec2(position.x * viewportSize.y / viewportSize.x, position.y);

                    gl_Position = transform * vec4(p, 0.0, 1.0);
                }
                `,
                `
                #version 100

                precision mediump float;     

                uniform vec4 color;
                uniform sampler2D glyphAtlas;

                uniform mat4 transform;

                varying vec2 vUv;
                varying float vFieldRangeDisplay_px;

                float median(float r, float g, float b) {
                    return max(min(r, g), min(max(r, g), b));
                }

                void main() {
                    vec3 sample = texture2D(glyphAtlas, vUv).rgb;

                    float sigDist = median(sample.r, sample.g, sample.b);

                    // spread field range over 1px for antialiasing
                    sigDist = clamp((sigDist - 0.5) * vFieldRangeDisplay_px + 0.5, 0.0, 1.0);

                    float alpha = sigDist;

                    gl_FragColor = color * alpha;
                }
                `,
                ['position', 'uv']
            );
        }
        
        // @! initialize font resources
        // get a hash for the font texture
        // if the font's textures hasn't been uploaded as a shared resource, upload it
        let textureKey = this._fontAsset.descriptor.metadata.postScriptName;

        // recreate vertex buffers and vertex state object
        this.deleteGPUVertexResources();

        // re-create text vertex buffer
        let vertexData = GPUText.generateVertexData(this._glyphLayout);

        this.vertexCount = vertexData.vertexCount;

        this.gpuVertexBuffer = device.createBuffer({
            data: vertexData.vertexArray,
            usageHint: BufferUsageHint.STATIC
        });

        // re-create text vertex state
        this.gpuVertexState = device.createVertexState({
            attributes: [
                // position
                {
                    buffer: this.gpuVertexBuffer,
                    size: vertexData.vertexLayout.position.elements,
                    dataType: VertexAttributeDataType.FLOAT,
                    offsetBytes: vertexData.vertexLayout.position.offsetBytes,
                    strideBytes: vertexData.vertexLayout.position.strideBytes,
                    normalize: false,
                },
                // uv
                {
                    buffer: this.gpuVertexBuffer,
                    size: vertexData.vertexLayout.uv.elements,
                    dataType: VertexAttributeDataType.FLOAT,
                    offsetBytes: vertexData.vertexLayout.uv.offsetBytes,
                    strideBytes: vertexData.vertexLayout.uv.strideBytes,
                    normalize: false,
                }
            ]
        });
    }

    releaseGPUResources() {
        this.deleteGPUVertexResources();
    }

    draw(context: DrawContext) {
        // renderpass/shader
        context.uniform2f('viewportSize', context.viewport.w, context.viewport.h);

        // font
        context.uniform1f('fieldRange', this._fontAsset.descriptor.fieldRange_px);
        // @! context.uniformSampler2D('glyphAtlas', this.glyphAtlas);

        context.uniform4fv('color', this.color);
        context.uniformMatrix4fv('transform', false, this.worldTransformMat4);
        context.draw(DrawMode.TRIANGLES, this.vertexCount, 0);
    }

    protected deleteGPUVertexResources() {
        if (this.gpuVertexState != null) {
            this.gpuVertexState.delete();
            this.gpuVertexState = null;
        }

        if (this.gpuVertexBuffer != null) {
            this.gpuVertexBuffer.delete();
            this.gpuVertexBuffer = null;
        }

        this.vertexCount = 0;
    }

    protected updateFontPath() {
        Text.getFontAsset(this._fontPath, (asset) => {
            console.log('font ready', asset);
            this._fontAsset = asset;
            this.updateGlyphLayout();
        });
    }

    protected updateGlyphLayout() {
        if (this._string != null && this._fontAsset != null) {
            this._glyphLayout = GPUText.layout(this._string, this._fontAsset.descriptor, {
                lineHeight: this._lineHeight,
                ligaturesEnabled: this._ligaturesEnabled,
                kerningEnabled: this._kerningEnabled,
            });
        } else {
            this._glyphLayout = null;
        }

        this.render = this._string != null && this._glyphLayout != null;
        this.gpuResourcesNeedAllocate = true;
    }

    // Font loading and caching
    protected static fontMap: {
        [path: string]: Promise<FontAsset>
    } = {} 

    protected static getFontAsset(path: string, onReady: (asset: FontAsset) => void, onError?: (msg: string) => void) {
        let promise = Text.fontMap[path];

        if (promise == null) {
            promise = Text.fontMap[path] = new Promise<FontAsset>((resolve, reject) => {
                console.log('requesting', path);

                // parse path
                let directory = path.substr(0, path.lastIndexOf('/'));
                let ext = path.substr(path.lastIndexOf('.') + 1).toLowerCase();

                if (ext !== 'json') {
                    console.warn('Only the JSON form of GPUText is implemented');
                }

                let descriptor: GPUTextFont;
                let images = new Array<Array<HTMLImageElement>>();

                let complete = false;

                loadDescriptor(path);

                function tryComplete() {
                    for (let page of images) {
                        for (let mip of page) {
                            if (!mip.complete) return;
                        }
                    }

                    if (descriptor == null) return;

                    if (complete) return;

                    resolve({
                        descriptor: descriptor,
                        images: images
                    });

                    complete = true;
                }

                function loadDescriptor(path: string) {
                    let req = new XMLHttpRequest();
                    req.open('GET', path);
                    req.responseType = ext === 'json' ? 'json' : 'arraybuffer';
                    req.onerror = (e) => {
                        reject(`Could not load font ${path}`);
                    }
                    req.onload = (e) => {
                        descriptor = req.responseType === 'json' ? req.response : parseDescriptorBuffer(req.response);
                        loadImages(descriptor.textures);
                        tryComplete();
                    }
                    req.send();
                }

                function loadImages(pages: Array<Array<ResourceReference>>) {
                    for (let i = 0; i < pages.length; i++) {
                        let page = pages[i];
                        images[i] = new Array<HTMLImageElement>();

                        for (let j = 0; j < page.length; j++) {
                            let mipResource = page[j];

                            if (mipResource.localPath) {
                                let image = new Image();
                                image.onload = tryComplete;
                                image.src = directory + '/' + mipResource.localPath;
                                images[i][j] = image;
                            } else if (ext === 'bin' && mipResource.payloadByteRange) {
                                reject(`Textures in binary payload not yet supported`);
                            } else {
                                reject(`Could not load resource "${mipResource}`);
                            }
                        }
                    }

                    tryComplete();
                }

                function parseDescriptorBuffer(arraybuffer: ArrayBuffer): GPUTextFont {
                    reject('Binary GPUText files are not supported');
                    return null;
                }

            });
        }

        promise.then(onReady).catch(onError);
    }

}

type FontAsset = {
    descriptor: GPUTextFont,
    images: Array<Array<HTMLImageElement>>
}

export default Text;