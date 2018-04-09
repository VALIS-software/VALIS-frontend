import { Device, GPUVertexState, VertexAttributeDataType, GPUProgram, GPUBuffer, GPUIndexBuffer } from "../../rendering/Device";

export class SharedResources {

    static quadIndicies: GPUIndexBuffer;
    static unitQuadVertexState: GPUVertexState;
    static quad1x1VertexState: GPUVertexState;

    private static programs: { [key: string]: GPUProgram } = {};

    static getProgram(device: Device, vertexCode: string, fragmentCode: string, attributeBindings: Array<string>) {
        let key = vertexCode + '\x35' + fragmentCode + '\x35' + attributeBindings.join('\x37');
        let gpuProgram = SharedResources.programs[key];

        if (gpuProgram == null) {
            gpuProgram = device.createProgram(vertexCode, fragmentCode, attributeBindings);
            SharedResources.programs[key] = gpuProgram;
        }

        return gpuProgram;
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
                    elementsPerVertex: 2,
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
                    elementsPerVertex: 2,
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
    }

}

export default SharedResources;