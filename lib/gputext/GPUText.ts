/**

	# GPU Text Core

	Provides text layout and vertex buffer generation

	Dev notes:
	- Should have progressive layout where text can be appended to an existing layout

**/

class GPUText {

	// y increases from top-down (like HTML/DOM coordinates)
	// y = 0 is set to be the font's ascender: https://i.stack.imgur.com/yjbKI.png
	// https://stackoverflow.com/a/50047090/4038621
	static layout(
		text: string,
		font: GPUTextFont,
		layoutOptions: {
			kerningEnabled?: boolean,
			ligaturesEnabled?: boolean,
			lineHeight?: number,
		},
		fontSize?: number,
	): GlyphLayout {
		const opts = {
			kerningEnabled: true,
			ligaturesEnabled: true,
			lineHeight: 1.0,
			...layoutOptions
		}

		let scale = 1;

		// in browsers, font-size corresponds to the difference between typoAscender and typoDescender
		if (fontSize != null) {
			let typoDelta = font.typoAscender - font.typoDescender;
			scale = fontSize / typoDelta;
		}

		// scale text-wrap container
		// @! let containerWidth /= scale;

		// pre-allocate for each character having a glyph
		const sequence = new Array(text.length);
		let sequenceIndex = 0;

		const bounds = {
			l: 0, r: 0,
			t: 0, b: 0,
		}

		let x = 0;
		let y = 0;

		for (let c = 0; c < text.length; c++) {
			let char = text[c];
			let charCode = text.charCodeAt(c);

			// @! layout
			switch (charCode) {
				case 0xA0:
				// space character that prevents an automatic line break at its position. In some formats, including HTML, it also prevents consecutive whitespace characters from collapsing into a single space.
				// @! todo
				case '\n'.charCodeAt(0): // newline
					y += opts.lineHeight;
					x = 0;
					continue;
			}

			if (opts.ligaturesEnabled) {
				// @! todo, replace char and charCode if sequence maps to a ligature
			}

			if (opts.kerningEnabled && c > 0) {
				let kerningKey = text[c - 1] + char;
				x += font.kerning[kerningKey] || 0.0;
			}

			const fontCharacter = font.characters[char];
			const glyph = fontCharacter.glyph;

			if (fontCharacter == null) {
				console.warn(`Font does not contain character for "${char}" (${charCode})`);
				continue;
			}

			if (glyph != null) {
				// character has a glyph

				// this corresponds top-left coordinate of the glyph, like hanging letters on a line
				sequence[sequenceIndex++] = {
					char: char,
					x: x,
					y: y
				};

				// width of a character is considered to be its 'advance'
				// height of a character is considered to be the lineHeight
				bounds.r = Math.max(bounds.r, x + fontCharacter.advance);
				bounds.b = Math.max(bounds.b, y + opts.lineHeight);
			}

			// advance glyph position
			// @! layout
			x += fontCharacter.advance;
		}

		// trim empty entries
		if (sequence.length > sequenceIndex) {
			sequence.length = sequenceIndex;
		}

		return {
			font: font,
			sequence: sequence,
			bounds: bounds,
			scale: scale,
		}
	}

	/**
		Todo: docs

		Generates OpenGL coordinates where y increases from bottom to top

		=> float32, [p, p, u, u, u], triangles with CCW face winding
	**/
	static generateVertexData(glyphLayout: GlyphLayout) {
		// memory layout details
		const elementSizeBytes = 4; // (float32)
		const positionElements = 2;
		const uvElements = 3; // uv.z = glyph.atlasScale
		const elementsPerVertex = positionElements + uvElements;
		const vertexSizeBytes = elementsPerVertex * elementSizeBytes;
		const characterVertexCount = 6;

		const vertexArray = new Float32Array(glyphLayout.sequence.length * characterVertexCount * elementsPerVertex);

		let characterOffset_vx = 0; // in terms of numbers of vertices rather than array elements

		for (let i = 0; i < glyphLayout.sequence.length; i++) {
			const item = glyphLayout.sequence[i];
			const font = glyphLayout.font;
			const fontCharacter = font.characters[item.char];
			const glyph = fontCharacter.glyph;

			// quad dimensions
			let px = item.x - glyph.offset.x;
			// y = 0 in the glyph corresponds to the baseline, which is font.ascender from the top of the glyph
			let py = -(item.y + font.ascender + glyph.offset.y);

			let w = glyph.atlasRect.w / glyph.atlasScale; // convert width to normalized font units
			let h = glyph.atlasRect.h / glyph.atlasScale;

			// uv
			// add half-text offset to map to texel centers
			let ux = (glyph.atlasRect.x + 0.5) / font.textureSize.w;
			let uy = (glyph.atlasRect.y + 0.5) / font.textureSize.h;
			let uw = (glyph.atlasRect.w - 1.0) / font.textureSize.w;
			let uh = (glyph.atlasRect.h - 1.0) / font.textureSize.h;
			// flip glyph uv y, this is different from flipping the glyph y _position_
			uy = uy + uh;
			uh = -uh;
			// two-triangle quad with ccw face winding
			vertexArray.set([
				px, py, ux, uy, glyph.atlasScale, // bottom left
				px + w, py + h, ux + uw, uy + uh, glyph.atlasScale, // top right
				px, py + h, ux, uy + uh, glyph.atlasScale, // top left

				px, py, ux, uy, glyph.atlasScale, // bottom left
				px + w, py, ux + uw, uy, glyph.atlasScale, // bottom right
				px + w, py + h, ux + uw, uy + uh, glyph.atlasScale, // top right
			], characterOffset_vx * elementsPerVertex);

			// advance character quad in vertex array
			characterOffset_vx += characterVertexCount;
		}

		return {
			vertexArray: vertexArray,
			elementsPerVertex: elementsPerVertex,
			vertexCount: characterOffset_vx,
			vertexLayout: {
				position: {
					elements: positionElements,
					elementSizeBytes: elementSizeBytes,
					strideBytes: vertexSizeBytes,
					offsetBytes: 0,
				},
				uv: {
					elements: uvElements,
					elementSizeBytes: elementSizeBytes,
					strideBytes: vertexSizeBytes,
					offsetBytes: positionElements * elementSizeBytes,
				}
			}
		}
	}

}

export interface TextureAtlasGlyph {
	// location of glyph within the text atlas, in units of pixels
	atlasRect: { x: number, y: number, w: number, h: number },
	atlasScale: number, // (normalized font units) * atlasScale = (pixels in texture atlas)

	// the offset within the atlasRect in normalized font units
	offset: { x: number, y: number },
}

export interface TextureAtlasCharacter {
	// the distance from the glyph's x = 0 coordinate to the x = 0 coordinate of the next glyph, in normalized font units
	advance: number,
	glyph?: TextureAtlasGlyph,
}

export interface ResourceReference {
	// range of bytes within the file's binary payload
	payloadByteRange?: {
		start: number,
		length: number
	},

	// path relative to font file
	// an implementation should not allow resource paths to be in directories _above_ the font file
	localPath?: string,
}

export interface GPUTextFont {
	format: 'TextureAtlasFont',
	version: number,

	technique: 'msdf' | 'sdf' | 'bitmap',

	characters: { [character: string]: TextureAtlasCharacter },
	kerning: { [characterPair: string]: number },

	textures: Array<
		// array of mipmap levels, where 0 = largest and primary texture (mipmaps may be omitted)
		Array<ResourceReference>
	>,

	textureSize: {
		w: number,
		h: number,
	},

	// the following are in normalized font units where (ascender - descender) = 1.0
	ascender: number,
	descender: number,
	typoAscender: number,
	typoDescender: number,
	lowercaseHeight: number,

	metadata: {
		family: string,
		subfamily: string,
		version: string,
		postScriptName: string,

		copyright: string,
		trademark: string,
		manufacturer: string,
		manufacturerURL: string,
		designerURL: string,
		license: string,
		licenseURL: string,

		// original authoring height
		// this can be used to reproduce the unnormalized source values of the font
		height_funits: number,
		funitsPerEm: number,
	},

	fieldRange_px: number,

	// glyph bounding boxes in normalized font units
	// not guaranteed to be included in the font file
	glyphBounds?: { [character: string]: { left: number, bottom: number, right: number, top: number } }
}

export interface GlyphLayout {
	font: GPUTextFont,
	sequence: Array<{
		char: string,
		x: number,
		y: number
	}>,
	bounds: { l: number, r: number, t: number, b: number },
	scale: number,
}

export default GPUText;