import { Object2D } from "../../rendering/Object2D";
import { Device, GPUProgram } from "../../rendering/Device";
import { SharedResources } from "./SharedResources";
import { DrawContext, DrawMode } from "../../rendering/Renderer";

export class Rect extends Object2D {

    color = new Float32Array([1, 0, 0, 1]);

    constructor() {
        super();
    }

    allocateGPUResources(device: Device) {
        // static initializations
        this.gpuVertexState = SharedResources.unitQuadVertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            `
                #version 100

                attribute vec2 position;

                varying vec2 vUv;

                void main() {
                    vUv = position * 0.5 + 0.5;
                    gl_Position = vec4(position, 0., 1.);
                }
            `,
            `
                #version 100

                precision mediump float;
                varying vec2 vUv;

                uniform vec4 color;
                
                void main() {
                    gl_FragColor = color;//vec4(vUv, 0., 1.);
                }
            `,
            ['position']
        );

        console.log(this.gpuProgram);
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
    }

    draw(context: DrawContext) {
        context.uniform4fv('color', this.color);
        context.draw(DrawMode.TRIANGLES, 6, 0);
    }

}

export default Rect;