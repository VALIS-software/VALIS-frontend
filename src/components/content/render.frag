precision mediump float;

varying vec2 coord;
// uniform sampler2D image;
uniform vec3 tint;

void main() {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); //texture2D(image, coord) + vec4(tint, 0);
}