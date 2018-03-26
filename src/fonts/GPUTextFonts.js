import GPUText from '../../lib/gputext/gputext.js';
import GPUTextWebGL from '../../lib/gputext/gputext-webgl.js';

// built-in fonts
import OpenSansRegularJson from './OpenSans-Regular.json';
import OpenSansRegularAtlas from './OpenSans-Regular-0.png';

/**
 * Singleton to load and store GPUTextFonts for use anywhere in the app
 */
class GPUTextFonts {

    static getFont(postScriptName) {
        return this._fonts[postScriptName];
    }

    static getAtlasTexture(gl, font) {
        if (font._atlasTexture == null) {
            font._atlasTexture = GPUTextWebGL.createGlyphAtlas(gl, font.atlas);
        }
        return font._atlasTexture;
    }

    static loadFontAtlas(font, atlasUrl) {
        const _fonts = this._fonts;
        const glyphAtlas = new Image();
        glyphAtlas.onload = function() {
            _fonts[font.metadata.postScriptName] = {
                descriptor: font,
                atlas: glyphAtlas,
                _atlasTexture: null,
            };
        };
        glyphAtlas.src = atlasUrl;
    }

}

GPUTextFonts._fonts = {};
GPUTextFonts.loadFontAtlas(OpenSansRegularJson, OpenSansRegularAtlas);

export default GPUTextFonts;
