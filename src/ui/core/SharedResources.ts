import { Device, GPUVertexState, VertexAttributeDataType, GPUProgram, GPUBuffer, GPUIndexBuffer, TextureDescriptor, GPUTexture, BufferDescriptor } from "../../rendering/Device";

export class SharedResources {

    static quadIndicies: GPUIndexBuffer;
    static unitQuadVertexState: GPUVertexState;
    static quad1x1VertexState: GPUVertexState;

    private static programs: { [key: string]: GPUProgram } = {};
    private static textures: { [key: string]: GPUTexture } = {};
    private static buffers: { [key: string]: GPUBuffer } = {};

    static getProgram(device: Device, vertexCode: string, fragmentCode: string, attributeBindings: Array<string>) {
        let key = vertexCode + '\x35' + fragmentCode + '\x35' + attributeBindings.join('\x37');
        let gpuProgram = SharedResources.programs[key];

        if (gpuProgram == null) {
            gpuProgram = device.createProgram(vertexCode, fragmentCode, attributeBindings);
            SharedResources.programs[key] = gpuProgram;
        }

        return gpuProgram;
    }

    static deleteProgram(vertexCode: string, fragmentCode: string, attributeBindings: Array<string>) {
        let key = vertexCode + '\x35' + fragmentCode + '\x35' + attributeBindings.join('\x37');
        let gpuProgram = SharedResources.programs[key];

        if (gpuProgram != null) {
            gpuProgram.delete();
            delete SharedResources.programs[key];
            return true;
        }

        return false;
    }

    static getTexture(device: Device, key: string, descriptor: TextureDescriptor) {
        let gpuTexture = SharedResources.textures[key];

        if (gpuTexture == null) {
            gpuTexture = device.createTexture(descriptor);
            SharedResources.textures[key] = gpuTexture;
        }

        return gpuTexture;
    }

    static deleteTexture(key: string) {
        let gpuTexture = SharedResources.textures[key];

        if (gpuTexture != null) {
            gpuTexture.delete();
            delete SharedResources.textures[key];
            return true;
        }

        return false;
    }

    static getBuffer(device: Device, key: string, descriptor: BufferDescriptor) {
        let gpuBuffer = SharedResources.buffers[key];

        if (gpuBuffer == null) {
            gpuBuffer = device.createBuffer(descriptor);
            SharedResources.buffers[key] = gpuBuffer;
        }

        return gpuBuffer;
    }

    static deleteBuffer(key: string) {
        let gpuBuffer = SharedResources.buffers[key];

        if (gpuBuffer != null) {
            gpuBuffer.delete();
            delete SharedResources.buffers[key];
            return true;
        }

        return false;
    }

    static initialize(device: Device) {
        this.quadIndicies = device.createIndexBuffer({
            data: new Uint8Array([
                0, 1, 2,
                0, 3, 1
            ])
        });

        SharedResources.unitQuadVertexState = device.createVertexState({
            index: this.quadIndicies,
            attributes: [
                {
                    buffer: device.createBuffer({
                        data: new Float32Array([
                            -1.0, -1.0,
                             1.0,  1.0,
                            -1.0,  1.0,
                             1.0, -1.0,
                        ]),
                    }),
                    size: 2,
                    dataType: VertexAttributeDataType.FLOAT,
                    offsetBytes: 0,
                    strideBytes: 2 * 4
                }
            ]
        });

        SharedResources.quad1x1VertexState = device.createVertexState({
            index: this.quadIndicies,
            attributes: [
                {
                    buffer: device.createBuffer({
                        data: new Float32Array([
                            0, 0,
                            1.0, 1.0,
                            0, 1.0,
                            1.0, 0,
                        ]),
                    }),
                    size: 2,
                    dataType: VertexAttributeDataType.FLOAT,
                    offsetBytes: 0,
                    strideBytes: 2 * 4
                }
            ]
        });
    }

    static release() {
        SharedResources.quadIndicies.delete();
        SharedResources.quadIndicies = null;
        SharedResources.unitQuadVertexState.delete();
        SharedResources.unitQuadVertexState = null;
        SharedResources.quad1x1VertexState.delete();
        SharedResources.quad1x1VertexState = null;

        for (let key of Object.keys(SharedResources.programs)) {
            SharedResources.programs[key].delete();
        }
        SharedResources.programs = {};

        for (let key of Object.keys(SharedResources.textures)) {
            SharedResources.textures[key].delete();
        }
        SharedResources.textures = {};

        for (let key of Object.keys(SharedResources.buffers)) {
            SharedResources.buffers[key].delete();
        }
        SharedResources.buffers = {};
    }

}

export default SharedResources;