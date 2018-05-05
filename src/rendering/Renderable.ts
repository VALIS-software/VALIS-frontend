import Node from './Node';
import RenderPass from './RenderPass';
import { Device, GPUProgram, GPUVertexState } from './Device';
import { BlendMode, DrawContext } from './Renderer';

export type RenderableInternal = {
	gpuResourcesNeedAllocate: boolean,
	gpuProgram: GPUProgram,
	gpuVertexState: GPUVertexState,
	_renderStateKey: number,
	_maskIndex: number,
	allocateGPUResources: (device: Device) => void,
}

/**
 * Renderable is the base type for a node that can be rendered via Renderer
 * 
 * Renderer will call:
 * - `allocateGPUResources(device)` just before rendering the first time or if `gpuResourcesNeedAllocate` is true.
 * - `draw(context)` when executing `gpuProgram` with `gpuVertexState`
 * 
 * Renderer will not call `releaseGPUResources()`, this is up to the Renderable instance or owner to call
 * 
 * `allocateGPUResources(device)` must set the `gpu` prefixed fields before the instance is valid for rendering
 */
export class Renderable<T extends Node<any>> extends Node<T> {

	// set to false to disable any interaction with the rendering system (including masking)
	// if this is true, the instance must have gpu* fields set before the rendering
	render = true;
	// set to false to disable writing to the color buffer, however the object will still be drawn to the stencil buffer if it's used as a mask
	visible = true;
	// influences render order if transparent and sets precedence between otherwise equal state objects
	z: number;
	// when true, object is rendered in the transparency pass, this has a performance cost because z ordering has to take precedence over state-change-minimization ordering
	transparent = false;

	dependentRenderPasses = new Array<RenderPass>();
	blendMode = BlendMode.NONE;

	mask: Renderable<any> = null;

	// @:device-local
	protected gpuProgram: GPUProgram = null;
	protected gpuVertexState: GPUVertexState = null;
	protected gpuResourcesNeedAllocate = true;

	// non-owned fields
	private _renderStateKey: number = 0 | 0;
	private _maskIndex: number = -1;

	constructor() {
		super();
	}

	allocateGPUResources(device: Device) {}
	releaseGPUResources() {}
	draw(context: DrawContext) {}

}

export default Renderable;