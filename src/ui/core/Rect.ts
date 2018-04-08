import { Object2D } from "../../rendering/Object2D";
import { Device, GPUProgram } from "../../rendering/Device";
import { SharedResources } from "./SharedResources";
import { DrawContext, DrawMode } from "../../rendering/Renderer";
import { debug } from "util";

/**
 * Rectangle UI element
 * Todo:
 * - Support rounded corners, glow / shadows
 */
export class Rect extends Object2D {

    color = new Float32Array([1, 0, 0, 1]);

    get w() { return this._w; }
    get h() { return this._h; }
    set w(w: number) {
        this._w = w;
        this.bounds.l = -w * 0.5;
        this.bounds.r = w * 0.5;
    };
    set h(h: number) {
        this._h = h;
        this.bounds.b = -h * 0.5;
        this.bounds.t = h * 0.5;
    };

    protected _w = 1;
    protected _h = 1;

    constructor(w: number = 1, h: number = 1, color?: ArrayLike<number>) {
        super();
        this.w = w;
        this.h = h;
        if (color != null) {
            this.color.set(color);
        }
    }

    allocateGPUResources(device: Device) {
        // static initializations
        this.gpuVertexState = SharedResources.unitQuadVertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            `
                #version 100

                attribute vec2 position;
                uniform mat4 model;
                uniform vec2 size;

                varying vec2 vUv;

                void main() {
                    vUv = position * 0.5 + 0.5;
                    gl_Position = model * vec4(position * size, 0., 1.0);
                }
            `,
            `
                #version 100

                precision mediump float;
                varying vec2 vUv;

                uniform vec4 color;
                
                void main() {
                    gl_FragColor = color;
                }
            `,
            ['position']
        );
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
    }

    draw(context: DrawContext) {
        context.uniform2f('size', this.w * 0.5, this.h * 0.5);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform4fv('color', this.color);
        context.draw(DrawMode.TRIANGLES, 6, 0);
    }

}

export default Rect;