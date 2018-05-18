/**

Dev Notes:
- Should be dependency free, doesn't know about Renderer
- Should not have any state fields, purely object management
- TextureManager
	"Performance problems have been observed on some implementations when using uniform1i to update sampler uniforms. To change the texture referenced by a sampler uniform, binding a new texture to the texture unit referenced by the uniform should be preferred over using uniform1i to update the uniform itself."

Todo:
- Textures
- Device capabilities fields
- UNSIGNED_INT index buffer extension + basic fallback behavior

**/

export type DeviceInternal = {
	gl: WebGLRenderingContext,
	extVao: OES_vertex_array_object,
	extInstanced: ANGLE_instanced_arrays,
	compileShader: (code: string, type: number) => WebGLShader,
	applyVertexStateDescriptor: (vertexStateDescriptor: VertexStateDescriptor) => void,
	textureUnitState: Array<GPUTexture>,
	bindTextureToUnit: (texture: GPUTexture, unit: number) => void;
}

export class Device {

	get programCount() { return this._programCount; }
	get vertexStateCount() { return this._vertexStateCount; }
	get bufferCount() { return this._bufferCount; }

	capabilities: {
		vertexArrayObjects: boolean,
		instancing: boolean,
	} = {
		vertexArrayObjects: false,
		instancing: false,
	}

	readonly name: string;

	protected gl: WebGLRenderingContext;
	protected vertexStateIds = new IdManager(true);
	protected programIds = new IdManager(true);

	protected vertexShaderCache = new ReferenceCountCache<WebGLShader>((shader) => this.gl.deleteShader(shader));
	protected fragmentShaderCache = new ReferenceCountCache<WebGLShader>((shader) => this.gl.deleteShader(shader));

	protected extVao: null | OES_vertex_array_object;
	protected extInstanced: null | ANGLE_instanced_arrays;

	protected textureUnitState: Array<GPUTexture>;

	private _programCount = 0;
	private _vertexStateCount = 0;
	private _bufferCount = 0;
	private _textureCount = 0;

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl;
		// the vertex array object extension makes controlling vertex state simpler and faster
		// we require it for now because it's widely supported, however it's possible to work around lack of support
		this.extVao = gl.getExtension('OES_vertex_array_object');
		this.extInstanced = gl.getExtension('ANGLE_instanced_arrays');

		let extDebugInfo = gl.getExtension('WEBGL_debug_renderer_info');
		this.name = gl.getParameter(extDebugInfo == null ? gl.RENDERER : extDebugInfo.UNMASKED_RENDERER_WEBGL);

		this.textureUnitState = new Array(gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));

		this.capabilities.vertexArrayObjects = this.extVao != null;
		this.capabilities.instancing = this.extInstanced != null;
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
					// @! UNSIGNED_INT requires extension, should enable when required and fallback to re-interpreting as UNSIGNED_SHORT
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

	createVertexState(vertexStateDescriptor: VertexStateDescriptor) {
		const gl = this.gl;
		const extVao = this.extVao;

		let indexDataType = vertexStateDescriptor.index != null ? vertexStateDescriptor.index.dataType : null;

		let vaoSupported = extVao != null;

		let vertexStateHandle: GPUVertexState;
		if (vaoSupported) {
			let vao = extVao.createVertexArrayOES();
			extVao.bindVertexArrayOES(vao);
			this.applyVertexStateDescriptor(vertexStateDescriptor);
			extVao.bindVertexArrayOES(null);

			vertexStateHandle = new GPUVertexState(this, this.vertexStateIds.assign(), vao, true, indexDataType);
		} else {
			// when VAO is not supported, pass in the descriptor so vertex state can be applied when rendering
			vertexStateHandle = new GPUVertexState(this, this.vertexStateIds.assign(), vertexStateDescriptor, false, indexDataType);
		}

		this._vertexStateCount++;

		return vertexStateHandle;
	}

	deleteVertexState(handle: GPUVertexState) {
		if (this.extVao != null) {
			this.extVao.deleteVertexArrayOES(handle.native);
		}
		this.vertexStateIds.release(handle.id);
		this._vertexStateCount--;
	}

	createTexture(textureDescriptor: TextureDescriptor) {
		const gl = this.gl;

		let t = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, t);

		// sampling parameters
		let samplingParameters = {
			magFilter: TextureMagFilter.LINEAR,
			minFilter: TextureMagFilter.LINEAR,
			wrapT: TextureWrapMode.CLAMP_TO_EDGE,
			wrapS: TextureWrapMode.CLAMP_TO_EDGE,
			...textureDescriptor.samplingParameters,
		}

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, samplingParameters.magFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, samplingParameters.minFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, samplingParameters.wrapS);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, samplingParameters.wrapT);

		// set _global_ data upload parameters
		let pixelStorageParameters = {
			packAlignment: 4,
			unpackAlignment: 4,
			flipY: false,
			premultiplyAlpha: false,
			colorSpaceConversion: ColorSpaceConversion.DEFAULT,
			...textureDescriptor.pixelStorage,
		}

		gl.pixelStorei(gl.PACK_ALIGNMENT, pixelStorageParameters.packAlignment);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, pixelStorageParameters.unpackAlignment);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, pixelStorageParameters.flipY);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, pixelStorageParameters.premultiplyAlpha);
		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, pixelStorageParameters.colorSpaceConversion);

		// upload data if supplied
		if (textureDescriptor.mipmapData != null) {
			for (let i = 0; i < textureDescriptor.mipmapData.length; i++) {
				let data = textureDescriptor.mipmapData[i];
				if (ArrayBuffer.isView(data)) {
					gl.texImage2D(
						gl.TEXTURE_2D,
						i,
						textureDescriptor.format,
						textureDescriptor.width,
						textureDescriptor.height,
						0,
						textureDescriptor.format,
						textureDescriptor.dataType,
						data
					);
				} else {
					gl.texImage2D(
						gl.TEXTURE_2D,
						i,
						textureDescriptor.format,
						textureDescriptor.format,
						textureDescriptor.dataType,
						data
					);
				}
			}
		}

		if (textureDescriptor.generateMipmaps && textureDescriptor.mipmapData != null && textureDescriptor.mipmapData.length > 0) {
			gl.generateMipmap(gl.TEXTURE_2D);
		}

		let handle = new GPUTexture(this, t, textureDescriptor.usageHint == null ? TextureUsageHint.UNKNOWN : textureDescriptor.usageHint);

		this._textureCount++;
		return handle;
	}

	deleteTexture(handle: GPUTexture) {
		const gl = this.gl;
		// if texture is bound to a texture unit, unbind it and free the unit
		let handleInternal = handle as any as GPUTextureInternal;
		if (handleInternal.boundUnit !== -1) {
			this.freeTextureUnit(handleInternal.boundUnit);
		}

		gl.deleteTexture(handle.native);
		this._textureCount--;
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
		let uniformInfo: { [name: string]: WebGLActiveInfo } = {};
		let uniformLocation: { [name: string]: WebGLUniformLocation } = {};
		for (let i = 0; i < uniformCount; i++) {
			let info = gl.getActiveUniform(p, i);
			uniformInfo[info.name] = info;
			uniformLocation[info.name] = gl.getUniformLocation(p, info.name);
		}

		let programHandle = new GPUProgram(
			this,
			this.programIds.assign(),
			p,
			vertexCode,
			fragmentCode,
			attributeBindings,
			uniformInfo,
			uniformLocation
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

	protected applyVertexStateDescriptor(vertexStateDescriptor: VertexStateDescriptor) {
		const gl = this.gl;

		// set index
		if (vertexStateDescriptor.index != null) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexStateDescriptor.index.native);
		} else {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}

		// set attributes
		for (let i = 0; i < vertexStateDescriptor.attributes.length; i++) {
			let attribute = vertexStateDescriptor.attributes[i];
			if (attribute instanceof Float32Array) {
				gl.vertexAttrib4fv(i, attribute); // @! verify that this works with array length < 4
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer.native);
				gl.enableVertexAttribArray(i);
				gl.vertexAttribPointer(i, attribute.size, attribute.dataType, !!attribute.normalize, attribute.strideBytes, attribute.offsetBytes);
				if (attribute.instanceDivisor != null && this.extInstanced) {
					this.extInstanced.vertexAttribDivisorANGLE(i, attribute.instanceDivisor);
				}
			}
		}
	}

	protected bindTextureToUnit(texture: GPUTexture, unit: number) {
		const gl = this.gl;
		const textureInternal = texture as any as GPUTextureInternal;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, texture.native);
		textureInternal.boundUnit = unit;
		this.textureUnitState[unit] = texture;
	}

	protected freeTextureUnit(unit: number) {
		const gl = this.gl;
		let texture = this.textureUnitState[unit];
		const textureInternal = texture as any as GPUTextureInternal;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, null);
		textureInternal.boundUnit = -1;
		this.textureUnitState[unit] = undefined;
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
	size: number,
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

export enum TextureDataType {
	UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE,
	UNSIGNED_SHORT_5_6_5 = WebGLRenderingContext.UNSIGNED_SHORT_5_6_5,
	UNSIGNED_SHORT_4_4_4_4 = WebGLRenderingContext.UNSIGNED_SHORT_4_4_4_4,
	UNSIGNED_SHORT_5_5_5_1 = WebGLRenderingContext.UNSIGNED_SHORT_5_5_5_1,
	FLOAT = WebGLRenderingContext.FLOAT,
	// Extension HALF_FLOAT = 
}

export enum TextureFormat {
	ALPHA = WebGLRenderingContext.ALPHA,
	RGB = WebGLRenderingContext.RGB,
	RGBA = WebGLRenderingContext.RGBA,
	LUMINANCE = WebGLRenderingContext.LUMINANCE,
	LUMINANCE_ALPHA = WebGLRenderingContext.LUMINANCE_ALPHA,

	// @! should include compressed texture formats from extensions
}

// Non-standard, used to help inform which texture slots to free first
export enum TextureUsageHint {
	UNKNOWN = 0,
	HIGH_USAGE = 2,
}

export enum ColorSpaceConversion {
	NONE = WebGLRenderingContext.NONE,
	DEFAULT = WebGLRenderingContext.BROWSER_DEFAULT_WEBGL,
}

export enum TextureMagFilter {
	NEAREST = WebGLRenderingContext.NEAREST,
	LINEAR = WebGLRenderingContext.LINEAR,
}

export enum TextureMinFilter {
	NEAREST = WebGLRenderingContext.NEAREST,
	LINEAR = WebGLRenderingContext.LINEAR,
	NEAREST_MIPMAP_NEAREST = WebGLRenderingContext.NEAREST_MIPMAP_NEAREST,
	LINEAR_MIPMAP_NEAREST = WebGLRenderingContext.LINEAR_MIPMAP_NEAREST,
	NEAREST_MIPMAP_LINEAR = WebGLRenderingContext.NEAREST_MIPMAP_LINEAR,
	LINEAR_MIPMAP_LINEAR = WebGLRenderingContext.LINEAR_MIPMAP_LINEAR,
}

export enum TextureWrapMode {
	REPEAT = WebGLRenderingContext.REPEAT,
	CLAMP_TO_EDGE = WebGLRenderingContext.CLAMP_TO_EDGE,
	MIRRORED_REPEAT = WebGLRenderingContext.MIRRORED_REPEAT,
}

export type TexImageSource = ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

export type TextureDescriptor = {

	format: TextureFormat,
	generateMipmaps: boolean,

	mipmapData?: Array<ArrayBufferView | TexImageSource>,
	width?: number,
	height?: number,
	dataType?: TextureDataType,

	usageHint?: TextureUsageHint,

	samplingParameters?: {
		magFilter?: TextureMagFilter,
		minFilter?: TextureMinFilter,
		wrapS?: TextureWrapMode,
		wrapT?: TextureWrapMode,
	}

	pixelStorage?: {
		packAlignment?: number,
		unpackAlignment?: number,
		flipY?: boolean,
		premultiplyAlpha?: boolean,
		colorSpaceConversion?: ColorSpaceConversion,
	},

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

export type GPUTextureInternal = {
	boundUnit: number;
}

export class GPUTexture implements GPUObjectHandle {

	protected boundUnit: number = -1;

	constructor(
		protected readonly device: Device,
		readonly native: WebGLTexture,
		protected readonly usageHint: TextureUsageHint
	) {}

	delete() {
		this.device.deleteTexture(this);
	}

}

export type GPUProgramInternal = {
	stateCache: { [key: string]: any };
}

export class GPUProgram implements GPUObjectHandle {

	protected stateCache: { [key: string]: any } = {};

	constructor(
		protected readonly device: Device,
		readonly id: number,
		readonly native: WebGLProgram,
		readonly vertexCode: string,
		readonly fragmentCode: string,
		readonly attributeBindings: Array<string>,
		readonly uniformInfo: { [ name: string ]: WebGLActiveInfo },
		readonly uniformLocation: { [ name: string ]: WebGLUniformLocation }
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

	constructor(protected minimize: boolean) { }

	assign(): number {
		if (this.availableIdQueue.length > 0) {
			return this.availableIdQueue.pop();
		}

		return this.top++;
	}

	release(id: number) {
		if (this.availableIdQueue.indexOf(id) !== -1) return false;

		this.availableIdQueue.push(id);

		if (this.minimize) {
			this.availableIdQueue.sort((a, b) => b - a);
		}

		return true;
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