precision mediump float;

varying vec2 coord;
// uniform sampler2D image;
uniform vec3 color;

uniform vec2 displayedRange;
uniform vec2 totalRange;

void main() {

	float currBp = mix(displayedRange.x, displayedRange.y, coord.x);
	float currUv = currBp / (totalRange.y - totalRange.x);
    gl_FragColor = vec4((0.5*sin(currUv*3000000000.0) + 0.5) * color * coord.y , 1.0); 
}