precision mediump float;

attribute vec2 points;
varying vec2 coord;
uniform vec2 pan;
uniform float trackHeight;
uniform vec2 windowSize;
uniform vec2 offset;

uniform vec2 displayedRange;
uniform vec2 totalRange;

vec2 UVtoGLCoordinates(vec2 uv) {
	return (uv * 2.0 -  1.0) / vec2(1, -1);
}

vec2 GLtoUVCoordinates(vec2 pt) {
	return (pt * vec2(1, -1) + 1.0) / 2.0; 
}

void main() {
	// coord maps to the range [0, 1] and is sent to the frag shader
    coord = GLtoUVCoordinates(points);

    vec2 transformed = coord * vec2(1.0, trackHeight) + offset;
    gl_Position = vec4(UVtoGLCoordinates(transformed), 0.0, 1.0);
}