import Node from './Node';
import RenderPass from './RenderPass';
import { Device, GPUProgram, GPUVertexState } from './Device';
import { BlendMode, DrawContext } from './Renderer';

export type RenderableInternal = {
	gpuResourcesNeedAllocate: boolean,
	gpuProgram: GPUProgram,
	gpuVertexState: GPUVertexState,
	_renderStateKey: number,
	allocateGPUResources: (device: Device) => void,
}

export class Renderable<T extends Node<any>> extends Node<T> {

	// set to false to disable rendering of this object
	render = true;
	// influences render order if transparent and sets precedence between otherwise equal state objects
	z: number;
	// when true, object is rendered in the transparency pass, this has a performance cost because z ordering has to take precedence over state-change-minimization ordering
	transparent = false;

	dependentRenderPasses = new Array<RenderPass>();
	blendMode = BlendMode.NONE;

	// @:device-local
	protected gpuProgram: GPUProgram = null;
	protected gpuVertexState: GPUVertexState = null;
	protected gpuResourcesNeedAllocate = true;

	// non-owned fields
	private _renderStateKey: number = 0 | 0;

	constructor() {
		super();
	}

	releaseGPUResources() {}
	draw(context: DrawContext) {}
	protected allocateGPUResources(device: Device) {}

}

export default Renderable;