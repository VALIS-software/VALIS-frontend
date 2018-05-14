const GPUText = require('../../lib/gputext/gputext.js');
const GPUTextWebGL = require('../../lib/gputext/gputext-webgl.js');

// built-in fonts
const OpenSansRegularJson = require('./OpenSans-Regular.json');
const OpenSansRegularAtlas = require('./OpenSans-Regular-0.png');



console.log(OpenSansRegularJson, OpenSansRegularAtlas);

/**
 * Singleton to load and store GPUTextFonts for use anywhere in the app
 */
class GPUTextFonts {
  static _fonts = {};

  static getFont(postScriptName) {
    return this._fonts[postScriptName];
  }

  static getAtlasTexture(gl, font) {
    if (font._atlasTexture == null) {
      font._atlasTexture = GPUTextWebGL.createGlyphAtlas(gl, font.atlas);
    }
    return font._atlasTexture;
  }

  static init() {
    GPUTextFonts.loadFont(OpenSansRegularJson, OpenSansRegularAtlas);
  }

  static loadFont(url, atlasUrlOverride) {
    const font = {
      descriptor: url,
      atlas: new Image(),
      _atlasTexture: null
    };

    font.atlas.src = atlasUrlOverride;
    this._fonts[font.descriptor.metadata.postScriptName] = font;
  }
}

export default GPUTextFonts;
