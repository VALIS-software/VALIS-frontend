/**

Dev notes

- Should be dependency free, doesn't know about Renderer
- Should not have any state fields, purely object management
- TextureManager
	"Performance problems have been observed on some implementations when using uniform1i to update sampler uniforms. To change the texture referenced by a sampler uniform, binding a new texture to the texture unit referenced by the uniform should be preferred over using uniform1i to update the uniform itself."

**/

export class Device {

	get programCount() { return this._programCount; }
	get vertexStateCount() { return this._vertexStateCount; }
	get bufferCount() { return this._bufferCount; }

	protected gl: WebGLRenderingContext;
	protected vertexStateIds = new IdManager(true);
	protected programIds = new IdManager(true);

	protected vertexShaderCache = new ReferenceCountCache<WebGLShader>((shader) => this.gl.deleteShader(shader));
	protected fragmentShaderCache = new ReferenceCountCache<WebGLShader>((shader) => this.gl.deleteShader(shader));

	protected _programCount = 0;
	protected _vertexStateCount = 0;
	protected _bufferCount = 0;

	protected extVao: null | OES_vertex_array_object;
	protected extInstanced: null | ANGLE_instanced_arrays;

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
		// the vertex array object extension makes controlling vertex state simpler and faster
		// we require it for now because it's widely supported, however it's possible to work around lack of support
		this.extVao = gl.getExtension('OES_vertex_array_object');
		this.extInstanced = gl.getExtension('ANGLE_instanced_arrays');

		if (this.extVao == null) {
			throw `Vertex array object extension is not supported`;
		}
	}

	createBuffer(bufferDescriptor: BufferDescriptor) {
		const gl = this.gl;

		let b = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, b);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			bufferDescriptor.data || bufferDescriptor.size,
			bufferDescriptor.usageHint || BufferUsageHint.STATIC
		);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		let bufferHandle = new GPUBuffer(this, b);
		this._bufferCount++;

		return bufferHandle;
	}

	/**
	 * @throws string if index data requires UInt extension on a device that doesn't support it
	 * @throws string if both dataType _and_ data are not set
	 */
	createIndexBuffer(indexBufferDescriptor: IndexBufferDescriptor) {
		const gl = this.gl;

		// determine index data type from data array type
		let dataType = indexBufferDescriptor.dataType;
		if (dataType == null) {
			if (indexBufferDescriptor.data != null) {
				switch (indexBufferDescriptor.data.BYTES_PER_ELEMENT) {
					case 1: dataType = IndexDataType.UNSIGNED_BYTE; break;
					case 2: dataType = IndexDataType.UNSIGNED_SHORT; break;
					case 4: dataType = IndexDataType.UNSIGNED_INT; break;
				}
			} else {
				throw 'dataType field is required if data is not set';
			}
		}

		if (dataType == IndexDataType.UNSIGNED_INT) {
			let uintExt = gl.getExtension('OES_element_index_uint');
			if (uintExt == null) {
				throw 'OES_element_index_uint is required but unavailable';
			}
		}

		let b = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
		gl.bufferData(
			gl.ELEMENT_ARRAY_BUFFER,
			indexBufferDescriptor.data || indexBufferDescriptor.size,
			indexBufferDescriptor.usageHint || BufferUsageHint.STATIC
		);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		let bufferHandle = new GPUIndexBuffer(this, b, dataType);
		this._bufferCount++;

		return bufferHandle;
	}

	updateBufferData(handle: GPUBuffer | GPUIndexBuffer, data: BufferDataSource, offsetBytes: number = 0) {
		if (handle instanceof GPUIndexBuffer) {
			this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, offsetBytes, data);
		} else {
			this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offsetBytes, data);
		}
	}

	deleteBuffer(handle: GPUBuffer | GPUIndexBuffer) {
		this.gl.deleteBuffer(handle.native);
		this._bufferCount--;
	}

	/**
	 * @throws string if shaders cannot be compiled or program cannot be linked
	 */
	createProgram(vertexCode: string, fragmentCode: string, attributeBindings: Array<string>) {
		const gl = this.gl;
		let vs: WebGLShader = this.vertexShaderCache.reference(vertexCode);
		let fs: WebGLShader = this.fragmentShaderCache.reference(fragmentCode);

		if (vs == null) {
			vs = this.compileShader(vertexCode, gl.VERTEX_SHADER);
			this.vertexShaderCache.add(vertexCode, vs);
		}

		if (fs == null) {
			fs = this.compileShader(fragmentCode, gl.FRAGMENT_SHADER);
			this.fragmentShaderCache.add(fragmentCode, fs);
		}

		let p = gl.createProgram();
		gl.attachShader(p, vs);
		gl.attachShader(p, fs);

		// set attribute bindings (before linking)
		for (let i = 0; i < attributeBindings.length; i++) {
			if (attributeBindings[i] == null) continue;
			gl.bindAttribLocation(p, i, attributeBindings[i]);
		}

		gl.linkProgram(p);

		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
			throw `[program link]: ${gl.getProgramInfoLog(p)}`;
		}

		// read all active uniform locations and cache them for later
		let uniformCount = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
		let uniformMap: {
			[key: string]: WebGLActiveInfo & { location: WebGLUniformLocation }
		} = {};
		for (let i = 0; i < uniformCount; i++) {
			let info = gl.getActiveUniform(p, i);
			uniformMap[info.name] = {
				...info,
				location: gl.getUniformLocation(p, info.name),
			}
		}

		let programHandle = new GPUProgram(
			this,
			this.programIds.assign(),
			p,
			vertexCode,
			fragmentCode,
			attributeBindings,
			uniformMap
		);
		this._programCount++;

		return programHandle;
	}

	deleteProgram(handle: GPUProgram) {
		this.gl.deleteProgram(handle);
		this.vertexShaderCache.release(handle.vertexCode);
		this.fragmentShaderCache.release(handle.fragmentCode);
		this.programIds.release(handle.id);
		this._programCount--;
	}

	createVertexState(vertexStateDescriptor: VertexStateDescriptor) {
		// handle doesn't already exist, create one
		const gl = this.gl;
		const extVao = this.extVao;

		let vao = this.extVao.createVertexArrayOES();
		extVao.bindVertexArrayOES(vao);
		{
			if (vertexStateDescriptor.index != null) {
				// set index
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexStateDescriptor.index.native);
			}

			// set attributes
			for (let i = 0; i < vertexStateDescriptor.attributes.length; i++) {
				let attribute = vertexStateDescriptor.attributes[i];
				if (attribute instanceof Float32Array) {
					gl.vertexAttrib4fv(i, attribute); // @! verify that this works with array length < 4
				} else {
					gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer.native);
					gl.enableVertexAttribArray(i);
					gl.vertexAttribPointer(i, attribute.elementsPerVertex, attribute.dataType, !!attribute.normalize, attribute.strideBytes, attribute.offsetBytes);
					if (attribute.instanceDivisor != null && this.extInstanced) {
						this.extInstanced.vertexAttribDivisorANGLE(i, attribute.instanceDivisor);
					}
				}
			}
		}
		extVao.bindVertexArrayOES(null);

		let indexDataType = vertexStateDescriptor.index != null ? vertexStateDescriptor.index.dataType : null;

		let isVao = true;

		let vertexStateHandle = new GPUVertexState(this, this.vertexStateIds.assign(), vao, isVao, indexDataType);
		this._vertexStateCount++;

		return vertexStateHandle;
	}

	deleteVertexState(handle: GPUVertexState) {
		this.extVao.deleteVertexArrayOES(handle.native);
		this.vertexStateIds.release(handle.id);
		this._vertexStateCount--;
	}

	protected compileShader(code: string, type: number): WebGLShader {
		let gl = this.gl;

		let s = gl.createShader(type);
		gl.shaderSource(s, code);
		gl.compileShader(s);

		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			let typename = null;
			switch (type) {
				case gl.VERTEX_SHADER: typename = 'vertex'; break;
				case gl.FRAGMENT_SHADER: typename = 'fragment'; break;
			}
			throw `[${typename} compile]: ${gl.getShaderInfoLog(s)}`;
		}

		return s;
	}


}

// Object Descriptors

export enum IndexDataType {
	UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE,
	UNSIGNED_SHORT = WebGLRenderingContext.UNSIGNED_SHORT,
	UNSIGNED_INT = WebGLRenderingContext.UNSIGNED_INT, // requires 'OES_element_index_uint' extension in WebGL1
}

export enum VertexAttributeDataType {
	BYTE = WebGLRenderingContext.BYTE,
	SHORT = WebGLRenderingContext.SHORT,
	UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE,
	UNSIGNED_SHORT = WebGLRenderingContext.UNSIGNED_SHORT,
	FLOAT = WebGLRenderingContext.FLOAT,
	// WebGL2 HALF_FLOAT
}

export enum BufferUsageHint {
	STREAM = WebGLRenderingContext.STREAM_DRAW,
	STATIC = WebGLRenderingContext.STATIC_DRAW,
	DYNAMIC = WebGLRenderingContext.DYNAMIC_DRAW,
}

export type BufferDataSource = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer;

export type BufferDescriptor = {
	data?: BufferDataSource,
	size?: number,
	usageHint?: BufferUsageHint,
}

export type IndexBufferDescriptor = {
	data?: Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array,
	size?: number,
	dataType?: IndexDataType,
	usageHint?: BufferUsageHint,
}

export type VertexConstant = Float32Array;

export type VertexAttribute = VertexConstant | {
	buffer: GPUBuffer,
	elementsPerVertex: number,
	dataType: VertexAttributeDataType,
	offsetBytes: number,
	strideBytes: number,
	normalize?: boolean,
	instanceDivisor?: number,
}

export type VertexStateDescriptor = {
	index?: GPUIndexBuffer,
	attributes: Array<VertexAttribute>
}

// Object Handles

interface GPUObjectHandle {
	delete: () => void
}

export class GPUBuffer implements GPUObjectHandle {

	constructor(protected readonly device: Device, readonly native: WebGLBuffer) {}

	delete() {
		this.device.deleteBuffer(this);
	}

}

export class GPUIndexBuffer extends GPUBuffer {

	constructor(device: Device, native: WebGLBuffer, readonly dataType: IndexDataType) {
		super(device, native);
	}

	delete() {
		this.device.deleteBuffer(this);
	}

}

export class GPUVertexState implements GPUObjectHandle {

	constructor(
		protected readonly device: Device,
		readonly id: number,
		readonly native: WebGLVertexArrayObjectOES | VertexStateDescriptor,
		readonly isVao: boolean,
		readonly indexType?: IndexDataType,
	) {}

	delete() {
		this.device.deleteVertexState(this);
	}

}

export class GPUProgram implements GPUObjectHandle {

	constructor(
		protected readonly device: Device,
		readonly id: number,
		readonly native: WebGLProgram,
		readonly vertexCode: string,
		readonly fragmentCode: string,
		readonly attributeBindings: Array<string>,
		readonly uniforms: { [ name: string ]: WebGLActiveInfo & { location: WebGLUniformLocation } }
	) {}

	delete() {
		this.device.deleteProgram(this);
	}

}

export default Device;

// private data structures

class IdManager {

	top: number = 0;
	availableIdQueue = new Array<number>();

	constructor(protected minimize: boolean) {}

	assign(): number {
		if (this.availableIdQueue.length > 0) {
			return this.availableIdQueue.pop();
		}
		return this.top++;
	}

	release(id: number) {
		if (this.availableIdQueue.indexOf(id) !== -1) return;

		this.availableIdQueue.push(id);

		if (this.minimize) {
			this.availableIdQueue.sort((a, b) => a - b);
		}
	}

	count(): number {
		return this.top - this.availableIdQueue.length;
	}

}

class ReferenceCountCache<T> {

	map: {
		[key: string] : {
			value: T,
			refs: number,
		}
	} = {};

	constructor(protected onZeroReferences: (value: T) => void) {}

	add(key: string, value: T) {
		this.map[key] = {
			value: value,
			refs: 1,
		};
	}

	reference(key: string): T | null {
		let r = this.map[key];
		if (r == null) return null;
		r.refs++;
		return r.value;
	}

	release(key: string) {
		let r = this.map[key];
		if (r == null) return false;
		r.refs--;
		if (r.refs === 0) {
			this.onZeroReferences(r.value);
			delete this.map[key];
			return false;
		}
		return true;
	}

}