precision mediump float;

varying vec2 coord;
// uniform sampler2D image;
uniform vec3 color;

uniform vec2 displayedRange;
uniform vec2 totalRange;

void main() {
	float currBp = mix(displayedRange.x, displayedRange.y, coord.x);
	float currUv = currBp / (totalRange.y - totalRange.x);
	if (currUv < 0.0 || currUv >= 1.0 ) {
		gl_FragColor = vec4(0.0);
	} else {
		gl_FragColor = vec4(1.0/0.05 * mod(currUv, 0.05) * color , 1.0); 	
	}
    
}