import { ShaderTrack, TileNode, Tile } from "genome-browser";
import { SignalTrackModel } from "./SignalTrackModel";
import { SignalTilePayload, SignalTileLoader } from "./SignalTileLoader";
import GPUDevice, { GPUTexture, AttributeType } from "engine/rendering/GPUDevice";
import { SharedResources } from "genome-browser";
import { DrawMode, DrawContext } from "engine/rendering/Renderer";

export class SignalTrack extends ShaderTrack<SignalTrackModel, SignalTileLoader> {

    protected constructTileNode() {
        return new SignalTile();
    }

    protected updateDisplay() {
        let tileLoader = this.getTileLoader();
        if (tileLoader.ready) {
            this.toggleLoadingIndicator(false, true);
            super.updateDisplay();
        } else {
            this.toggleLoadingIndicator(true, true);
        }
    }

}

class SignalTile extends TileNode<SignalTilePayload> {

    protected gpuTexture: GPUTexture;
    protected memoryBlockY: number;

    setTile(tile: Tile<SignalTilePayload>) {
        super.setTile(tile);

        if (this.tile != null) {
            this.memoryBlockY = (tile.blockRowIndex + 0.5) / tile.block.rows.length; // y-center of texel
        }
    }

    allocateGPUResources(device: GPUDevice) {
        // static initializations
        this.gpuVertexState = SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            SignalTile.vertexShader,
            SignalTile.fragmentShader,
            SignalTile.attributeLayout
        );

        // we assume .tile is set and in the complete state before allocateGPUResources is called
        this.gpuTexture = this.tile.payload.getTexture(device);
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
        this.gpuTexture = null;
    }

    draw(context: DrawContext) {
        let payload = this.tile.payload;

        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform1f('opacity', this.opacity);
        context.uniform1f('memoryBlockY', this.memoryBlockY);
        context.uniformTexture2D('memoryBlock', this.gpuTexture);
        context.draw(DrawMode.TRIANGLES, 6, 0);

        this.tile.markLastUsed();
    }

    protected static attributeLayout = [
        { name: 'position', type: AttributeType.VEC2 }
    ];

    protected static vertexShader = `
        #version 100

        attribute vec2 position;
        uniform mat4 model;
        uniform vec2 size;
        uniform float memoryBlockY;

        varying vec2 texCoord;
        varying vec2 vUv;

        void main() {
            texCoord = vec2(position.x, memoryBlockY);
            vUv = position;
            gl_Position = model * vec4(position * size, 0., 1.0);
        }
    `;

    protected static fragmentShader = `
        #version 100

        precision mediump float;
        uniform float opacity;
        uniform sampler2D memoryBlock;

        varying vec2 texCoord;
        varying vec2 vUv;

        vec3 viridis( float x ) {
            x = clamp(x, 0., 1.0);
            vec4 x1 = vec4( 1.0, x, x * x, x * x * x ); // 1 x x2 x3
            vec4 x2 = x1 * x1.w * x; // x4 x5 x6 x7
            return vec3(
                dot( x1, vec4( +0.280268003, -0.143510503, +2.225793877, -14.81508888 ) ) + dot( x2.xy, vec2( +25.212752309, -11.77258958 ) ),
                dot( x1, vec4( -0.002117546, +1.617109353, -1.909305070, +2.701152864 ) ) + dot( x2.xy, vec2(  -1.685288385, +0.178738871 ) ),
                dot( x1, vec4( +0.300805501, +2.614650302, -12.01913909, +28.93355911 ) ) + dot( x2.xy, vec2( -33.491294770, +13.76205384 ) )
            );
        }
        
        void main() {
            vec4 texRaw = texture2D(memoryBlock, texCoord);
            float debug = step(0.9, vUv.y);
            gl_FragColor = vec4(vec3(texRaw.r, vUv.xy * debug), 1.0) * opacity;
        }
    `;

}