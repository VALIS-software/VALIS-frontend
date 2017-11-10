precision mediump float;

attribute vec2 points;
varying vec2 coord;
uniform vec2 pan;
uniform vec2 zoom;
uniform vec2 size;
uniform vec2 offset;


uniform vec4 selection;

void main() {
	// coord maps to the range [0, 1] and is sent to the frag shader
    coord = (points * vec2(1, -1) + 1.0) / 2.0;

    // TODO: this is a little hard to read:
    vec2 transformed_point = points + vec2(1.0, 2.0/zoom.y - 1.0) - 1.0/zoom + ((pan*1.0/zoom + offset) * vec2(1, -1)) * 2.0/size.xy;
    gl_Position = vec4(zoom * transformed_point, 0.0, 1.0);
}