import Node from '../rendering/Node';
import Device from '../rendering/Device';
import RenderPass from '../rendering/RenderPass';
import { Renderable, RenderableInternal } from '../rendering/Renderable';

export enum BlendMode {
	None = 0,
	PremultipliedAlpha = 1,
	Add = 2,
	Multiply = 3,
}

export class Renderer {

	protected gl: WebGLRenderingContext;

	constructor(protected device: Device) {
		this.gl = (device as any).gl;
	}

	private _opaque = new Array<Renderable<any>>();
	private _transparent = new Array<Renderable<any>>();
	render(pass: RenderPass) {
		// let renderContext = f(device)
		const gl = this.gl;

		// render-state = transparent, programId, vertexStateId, blendMode, user
		// when transparent, z sort should override everything, but same-z should still sort by state
		// when opaque, z sort should come after user sort and depth within tree 
		//		programId, vertexStateId, blendMode, user-state, z, tree-depth

		// to avoid re-allocating a new array each frame, we reuse display list arrays from the previous frame and trim any excess
		let opaqueIndex = 0;
		let transparentIndex = 0;
		let opaque = this._opaque;
		let transparent = this._transparent;

		// iterate nodes, build optimized list for rendering
		for (let node of pass.root) {
			if (node instanceof Renderable) {
				if (!node.render) continue;

				let nodeInternal = node as any as RenderableInternal;

				// render any dependent render passes
				for (let subpass of node.dependentRenderPasses) {
					this.render(subpass);
				}

				// perform any nessesary allocations
				if (nodeInternal.gpuResourcesNeedAllocate) {
					nodeInternal.allocateGPUResources(this.device);
					if (nodeInternal.gpuProgram == null) {
						throw `Renderable field "gpuProgram" must be set before rendering`;
					}
					if (nodeInternal.gpuVertexState == null) {
						throw `Renderable field "gpuVertexState" must be set before rendering`;
					}
					nodeInternal.gpuResourcesNeedAllocate = false;
				}

				nodeInternal._renderStateKey = this.encodeRenderState(
					nodeInternal.gpuProgram.id,
					nodeInternal.gpuVertexState.id,
					node.blendMode
				);

				// transparent nodes are rendered from furthest to nearest
				if (node.transparent) {
					transparent[transparentIndex++] = node;
				} else {
					opaque[opaqueIndex++] = node;
				}
			}
		}

		// trim any excess elements from the last frame
		if (opaqueIndex < opaque.length) {
			opaque.length = opaqueIndex;
		}
		if (transparentIndex < transparent.length) {
			transparent.length = transparentIndex;
		}

		// sort opaque objects for rendering
		// @! this could be optimized
		opaque.sort((a, b) => {
			let ai = a as any as RenderableInternal;
			let bi = b as any as RenderableInternal;
			return ai._renderStateKey - bi._renderStateKey;
		});

		// begin rendering
		gl.bindFramebuffer(gl.FRAMEBUFFER, pass.target);

		let clearFlags = 0;
		if (pass.clearOptions.clearColor != null) {
			clearFlags |= gl.COLOR_BUFFER_BIT;
			gl.clearColor(pass.clearOptions.clearColor[0], pass.clearOptions.clearColor[1], pass.clearOptions.clearColor[2], pass.clearOptions.clearColor[3]);
		}

		if (pass.clearOptions.clearDepth != null) {
			clearFlags |= gl.DEPTH_BUFFER_BIT;
			gl.clearDepth(pass.clearOptions.clearDepth);
		}

		if (pass.clearOptions.clearStencil != null) {
			clearFlags |= gl.STENCIL_BUFFER_BIT;
			gl.clearStencil(pass.clearOptions.clearStencil);
		}

		gl.clear(clearFlags);

		// draw opaque objects
		let lastProgramId = -1;
		let lastVertexId = -1;
		let lastBlendMode = -1;
		for (let i = 0; i < opaque.length; i++) {
			let renderable = opaque[i];
			let internal = renderable as any as RenderableInternal;

			let programId = (internal._renderStateKey & this.stateSMask) >>> this.stateSOffset;
			let vertexId = (internal._renderStateKey & this.stateBMask) >>> this.stateBOffset;
			let blendMode = (internal._renderStateKey & this.stateMMask) >>> this.stateMOffset;

			// @! to avoid id max limits we should compare the GPU handle objects for change rather than the ID instance
			if (programId !== lastProgramId) {
				gl.useProgram(internal.gpuProgram);
				lastProgramId = programId;
			}

			if (vertexId !== lastVertexId) {
				lastVertexId = vertexId;
			}

			if (blendMode !== lastBlendMode) {

				if (blendMode === 0) {
					gl.disable(gl.BLEND);
				} else {
					if (lastBlendMode <= 0) {
						gl.enable(gl.BLEND);
					}

					switch (blendMode) {
						case BlendMode.PremultipliedAlpha:
							gl.blendEquation(gl.FUNC_ADD);
							gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
							break;
						default:
							throw `Blend mode "${BlendMode[blendMode]}" not yet implemented`;
					}
				}

				lastBlendMode = blendMode;
			}

			// renderable.draw(shaderContext / drawContext?)
		}
	}

	// In JavaScript we only get bitwise operations on 32-bit integers
	// 00000000 00000000 00000000 00000000
	// ssssssss bbbbbbbb bbbbbbbb bbbbmmmm
	protected readonly stateSOffset = 24;
	protected readonly stateSMask = 0xFF000000;
	protected readonly stateBOffset = 4;
	protected readonly stateBMask = 0x00FFFFF0;
	protected readonly stateMOffset = 0;
	protected readonly stateMMask = 0x0000000F;

	readonly MAX_SHADERS = this.stateSMask >>> this.stateSOffset;
	readonly MAX_BUFFERS = this.stateBMask >>> this.stateBOffset;
	readonly MAX_BLEND_MODES = this.stateMMask >>> this.stateMOffset;

	protected encodeRenderState(programId: number, vertexStateId: number, blendMode: number): number {
		return (programId << this.stateSOffset) |
			(vertexStateId << this.stateBOffset) |
			(blendMode << this.stateMOffset);
	}

	protected decodeRenderState(bits: number) {
		return {
			programId: (bits & this.stateSMask) >>> this.stateSOffset,
			vertexStateId: (bits & this.stateBMask) >>> this.stateBOffset,
			blendMode: (bits & this.stateMMask) >>> this.stateMOffset
		}
	}

}