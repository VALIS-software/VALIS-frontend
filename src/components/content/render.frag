precision mediump float;

varying vec2 coord;
// uniform sampler2D image;
uniform vec3 tint;

uniform vec2 zoom;
uniform vec2 pan;

void main() {
    gl_FragColor = vec4(coord.xy, 0.0, 1.0); 
}