import { Device, GPUProgram, GPUVertexState, GPUBuffer, BufferUsageHint, VertexAttributeDataType } from "../../rendering/Device";
import { SharedResources } from "./SharedResources";
import { DrawContext, DrawMode } from "../../rendering/Renderer";
import { Object2D } from "./Object2D";
import GPUText, { GPUTextFont } from "../../../lib/gputext/GPUText";

/**
 * Text
 * 
 * Todo:
 * - Glow and shadow
 */
export class Text extends Object2D {

    set text(v: string) {
        this._text = v;
        this.gpuResourcesNeedAllocate = true;
    }
    get text() { return this._text; }

    color: Float32Array = new Float32Array([1, 1, 1, 1]);
    
    protected _font: GPUTextFont;
    protected _text: string = null;
    protected _kerningEnabled = true;
    protected _ligaturesEnabled = true;
    protected _lineHeight = 1.0;

    // additional vertex state
    protected gpuVertexBuffer: GPUBuffer = null;
    protected vertexCount = 0;

    protected glyphAtlas: GPUTexture = null;

    constructor() {
        super();
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

        // recreate vertex buffers and vertex state object
        this.deleteGPUVertexResources();

        // re-create text vertex buffer
        if (this._text != null) {
            let glyphLayout = GPUText.layout(this._text, this._font, {
                lineHeight: this._lineHeight,
                ligaturesEnabled: this._ligaturesEnabled,
                kerningEnabled: this._kerningEnabled,
            });
            let vertexData = GPUText.generateVertexData(glyphLayout);

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
    }

    releaseGPUResources() {
        this.deleteGPUVertexResources();
    }

    draw(context: DrawContext) {
        if (this.vertexCount === 0) return;

        // renderpass/shader
        context.uniform2f('viewportSize', context.viewport.w, context.viewport.h);

        // font
        context.uniform1f('fieldRange', this._font.fieldRange_px);
        context.uniformSampler2D('glyphAtlas', this.glyphAtlas);

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

}

export default Text;