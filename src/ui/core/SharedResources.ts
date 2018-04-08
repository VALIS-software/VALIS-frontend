import { Device, GPUVertexState, VertexAttributeDataType, GPUProgram } from "../../rendering/Device";

export class SharedResources {

    static unitQuadVertexState: GPUVertexState;

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
        SharedResources.unitQuadVertexState = device.createVertexState({
            index: device.createIndexBuffer({
                data: new Uint8Array([
                    0, 1, 2,
                    0, 3, 1
                ])
            }),
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
    }

    static release() {
        SharedResources.unitQuadVertexState.delete();
        SharedResources.unitQuadVertexState = null;

        for (let key of Object.keys(SharedResources.programs)) {
            SharedResources.programs[key].delete();
        }
        SharedResources.programs = {};
    }

}

export default SharedResources;