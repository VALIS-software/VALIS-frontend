/**
 * Dev Notes
 * - State grouping: Often we want hierarchical state - i.e, set viewport for this node _and_ all of its children
 */

import Node from '../rendering/Node';
import Device, { GPUProgram, GPUVertexState, DeviceInternal, VertexStateDescriptor, VertexAttribute } from '../rendering/Device';
import RenderPass from '../rendering/RenderPass';
import { Renderable, RenderableInternal } from '../rendering/Renderable';

export enum BlendMode {
	NONE                = 0,
	PREMULTIPLIED_ALPHA = 1,
	ADD                 = 2,
	MULTIPLY            = 3,
}

export enum DrawMode {
	POINTS         = WebGLRenderingContext.POINTS,
	LINE_STRIP     = WebGLRenderingContext.LINE_STRIP,
	LINE_LOOP      = WebGLRenderingContext.LINE_LOOP,
	LINES          = WebGLRenderingContext.LINES,
	TRIANGLE_STRIP = WebGLRenderingContext.TRIANGLE_STRIP,
	TRIANGLE_FAN   = WebGLRenderingContext.TRIANGLE_FAN,
	TRIANGLES      = WebGLRenderingContext.TRIANGLES,
}

export class Renderer {

	protected device: Device;
	protected deviceInternal: DeviceInternal;
	protected gl: WebGLRenderingContext;
	protected extVao: null | OES_vertex_array_object;
	protected drawContext: DrawContext;

	constructor(device: Device) {
		this.device = device;
		this.deviceInternal = device as any as DeviceInternal;
		this.gl = this.deviceInternal.gl;
		this.extVao = this.deviceInternal.extVao;
		this.drawContext = new DrawContext(this.gl, this.deviceInternal.extInstanced);


		// @! temporary initial GL state for 2D drawing
		// in the future this should be applied to the root 2D node
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.depthFunc(this.gl.LEQUAL);
		this.gl.disable(this.gl.CULL_FACE);
	}

	private _opaque = new Array<Renderable<any>>();
	private _transparent = new Array<Renderable<any>>();
	render(pass: RenderPass) {
		const gl = this.gl;
		const drawContextInternal = this.drawContext as any as DrawContextInternal;

		pass.root.applyTreeTransforms(true);

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

				// perform any necessary allocations
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
		// @! this could be optimized by bucketing
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

		// by default, when starting a rendering pass the viewport is set to the render target dimensions
		if (pass.target == null) {
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			drawContextInternal.viewport.x = 0;
			drawContextInternal.viewport.y = 0;
			drawContextInternal.viewport.w = gl.drawingBufferWidth;
			drawContextInternal.viewport.h = gl.drawingBufferHeight;
		} else {
			// @! todo
			throw 'Todo: use target size for viewport';
		}

		gl.clear(clearFlags);

		// draw opaque objects
		let lastProgramId = -1;
		let lastVertexId = -1;
		let lastBlendMode = -1;
		let vaoFallback_lastAttributes: Array<VertexAttribute> = null;
		for (let i = 0; i < opaque.length; i++) {
			let renderable = opaque[i];
			let internal = renderable as any as RenderableInternal;

			let programId = (internal._renderStateKey & this.stateSMask) >>> this.stateSOffset;
			let vertexId = (internal._renderStateKey & this.stateBMask) >>> this.stateBOffset;
			let blendMode = (internal._renderStateKey & this.stateMMask) >>> this.stateMOffset;

			// Update state
			// @! to avoid id max limits we should compare the GPU handle objects for change rather than the ID instance
			if (programId !== lastProgramId) {
				gl.useProgram(internal.gpuProgram.native);
				drawContextInternal.program = internal.gpuProgram;
				lastProgramId = programId;
			}

			if (vertexId !== lastVertexId) {
				if (internal.gpuVertexState.isVao) {
					this.extVao.bindVertexArrayOES(internal.gpuVertexState.native);
				} else {
					// disable unused attribute arrays
					// assume the only enabled attributes are the ones from the last fallback descriptor
					if (vaoFallback_lastAttributes != null) {
						for (let a = 0; a < vaoFallback_lastAttributes.length; a++) {
							gl.disableVertexAttribArray(a);
						}
					}

					let descriptor = internal.gpuVertexState.native as VertexStateDescriptor;
					this.deviceInternal.applyVertexStateDescriptor(descriptor);
					vaoFallback_lastAttributes = descriptor.attributes;
				}

				drawContextInternal.vertexState = internal.gpuVertexState;
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
						case BlendMode.PREMULTIPLIED_ALPHA:
							gl.blendEquation(gl.FUNC_ADD);
							gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
							break;
						default:
							throw `Blend mode "${BlendMode[blendMode]}" not yet implemented`;
					}
				}

				lastBlendMode = blendMode;
			}

			renderable.draw(this.drawContext);
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

export type DrawContextInternal = {
	gl: WebGLRenderingContext;
	program: GPUProgram;
	vertexState: GPUVertexState;
	viewport: {
		x: number, y: number,
		w: number, h: number
	};
}

export class DrawContext {

	// current state
	readonly viewport: {
		x: number, y: number,
		w: number, h: number
	} = {x: 0, y: 0, w: 0, h: 0};
	readonly program: GPUProgram;
	readonly vertexState: GPUVertexState;

	constructor(protected readonly gl: WebGLRenderingContext, protected readonly extInstanced: ANGLE_instanced_arrays) {}

	uniform1f(name: string, x: GLfloat) {
		this.gl.uniform1f(this.program.uniformLocation[name], x);
	}
	uniform1fv(name: string, v: Float32Array) {
		this.gl.uniform1fv(this.program.uniformLocation[name], v);
	}
	uniform1i(name: string, x: GLint) {
		this.gl.uniform1i(this.program.uniformLocation[name], x);
	}
	uniform1iv(name: string, v: Int32Array) {
		this.gl.uniform1iv(this.program.uniformLocation[name], v);
	}
	uniform2f(name: string, x: GLfloat, y: GLfloat) {
		this.gl.uniform2f(this.program.uniformLocation[name], x, y);
	}
	uniform2fv(name: string, v: Float32Array) {
		this.gl.uniform2fv(this.program.uniformLocation[name], v);
	}
	uniform2i(name: string, x: GLint, y: GLint) {
		this.gl.uniform2i(this.program.uniformLocation[name], x, y);
	}
	uniform2iv(name: string, v: Int32Array) {
		this.gl.uniform2iv(this.program.uniformLocation[name], v);
	}
	uniform3f(name: string, x: GLfloat, y: GLfloat, z: GLfloat) {
		this.gl.uniform3f(this.program.uniformLocation[name], x, y, z);
	}
	uniform3fv(name: string, v: Float32Array) {
		this.gl.uniform3fv(this.program.uniformLocation[name], v);
	}
	uniform3i(name: string, x: GLint, y: GLint, z: GLint) {
		this.gl.uniform3i(this.program.uniformLocation[name], x, y, z);
	}
	uniform3iv(name: string, v: Int32Array) {
		this.gl.uniform3iv(this.program.uniformLocation[name], v);
	}
	uniform4f(name: string, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat) {
		this.gl.uniform4f(this.program.uniformLocation[name], x, y, z, w);
	}
	uniform4fv(name: string, v: Float32Array) {
		this.gl.uniform4fv(this.program.uniformLocation[name], v);
	}
	uniform4i(name: string, x: GLint, y: GLint, z: GLint, w: GLint) {
		this.gl.uniform4i(this.program.uniformLocation[name], x, y, z, w);
	}
	uniform4iv(name: string, v: Int32Array) {
		this.gl.uniform4iv(this.program.uniformLocation[name], v);
	}
	uniformMatrix2fv(name: string, transpose: boolean, value: Float32Array) {
		this.gl.uniformMatrix2fv(this.program.uniformLocation[name], transpose, value);
	}
	uniformMatrix3fv(name: string, transpose: boolean, value: Float32Array) {
		this.gl.uniformMatrix3fv(this.program.uniformLocation[name], transpose, value);
	}
	uniformMatrix4fv(name: string, transpose: boolean, value: Float32Array) {
		this.gl.uniformMatrix4fv(this.program.uniformLocation[name], transpose, value);
	}

	draw(mode: DrawMode, indexCount: number, indexOffset: number) {
		const gl = this.gl;
		if (this.vertexState.indexType != null) {
			gl.drawElements(mode, indexCount, this.vertexState.indexType, indexOffset);
		} else {
			gl.drawArrays(mode, indexOffset, indexCount);
		}
	}

	extDrawInstanced(mode: DrawMode, indexCount: number, indexOffset: number, primCount: number) {
		if (this.extInstanced !== null) {
			if (this.vertexState.indexType != null) {
				this.extInstanced.drawElementsInstancedANGLE(mode, indexCount, this.vertexState.indexType, indexOffset, primCount);
			} else {
				this.extInstanced.drawArraysInstancedANGLE(mode, indexOffset, indexCount, primCount);
			}
		} else {
			// @! fallback or warn
			console.error(`extDrawInstanced() failed: Instance drawing extension is not available`);
		}
	}

}

export default Renderer;