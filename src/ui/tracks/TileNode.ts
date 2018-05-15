import { Object2D } from "../core/Object2D";
import SharedResources from "../core/SharedResources";
import Device from "../../rendering/Device";
import { DrawContext, DrawMode } from "../../rendering/Renderer";

class TileNode extends Object2D {

    constructor() {
        super();
    }

    allocateGPUResources(device: Device) {
        // static initializations
        this.gpuVertexState = SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            `
                #version 100

                attribute vec2 position;
                uniform mat4 model;
                uniform vec2 size;
                uniform float memoryBlockY;

                varying vec2 vUv;

                void main() {
                    // @! compute vUv;
                    vUv = position;

                    gl_Position = model * vec4(position * size, 0., 1.0);
                }
            `,
            `
                #version 100

                precision mediump float;

                uniform sampler2D memoryBlock;
                varying vec2 vUv;
                
                void main() {
                    // vec4 data = texture2D(memoryBlock, vUv);

                    gl_FragColor = vec4(1., 0., 0., 1.);
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
        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.draw(DrawMode.TRIANGLES, 6, 0);
    }
    
}