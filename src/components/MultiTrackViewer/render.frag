precision mediump float;

varying vec2 coord;
// uniform sampler2D image;
uniform vec3 color;

uniform vec2 zoom;
uniform vec2 pan;

uniform vec4 selection;

void main() {
    gl_FragColor = vec4(color.xy, coord.x, 1.0); 
}