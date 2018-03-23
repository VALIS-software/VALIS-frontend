const GPUText = require('../../lib/gputext/gputext.js');
const GPUTextWebGL = require('../../lib/gputext/gputext-webgl.js');

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

    static loadFont(url) {
        const _fonts = this._fonts;

        // object modified as parts arrive
        const font = {
            descriptor: null,
            atlas: null,
            _atlasTexture: null,
        };

        function partLoaded() {
            // validate font for completion
            if (font.descriptor != null && font.atlas != null) {
                // font complete, make available
                _fonts[font.descriptor.metadata.postScriptName] = font;
            }
        }

        const jsonFont = url.substr(-5).toLowerCase() === '.json';

        if (jsonFont) {
            const i = url.lastIndexOf('/') + 1;
            const basename = url.substring(i, url.length - 5);
            const directory = url.substr(0, i);
            const glyphAtlasUrl = directory + basename + '-0.png';
            const glyphAtlas = new Image();
            glyphAtlas.onload = function() {
                font.atlas = glyphAtlas;
                partLoaded();
            };
            glyphAtlas.src = glyphAtlasUrl;
        }

        const req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.onload = function() {
            font.descriptor = JSON.parse(req.responseText);
            partLoaded();
        };
        req.send();
    }

}

GPUTextFonts._fonts = {};
GPUTextFonts._activeRequests = {};
GPUTextFonts.loadFont('assets/fonts/OpenSans-Regular.json');

export default GPUTextFonts;
