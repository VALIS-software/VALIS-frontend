precision mediump float;

varying vec2 coord;
// uniform sampler2D image;
uniform vec3 color;

uniform vec2 displayedRange;
uniform vec2 totalRange;

uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;
uniform sampler2D texture6;
uniform sampler2D texture7;

uniform vec2 range0;
uniform vec2 range1;
uniform vec2 range2;
uniform vec2 range3;
uniform vec2 range4;
uniform vec2 range5;
uniform vec2 range6;
uniform vec2 range7;

bool inRange(vec2 range, float bp) {
	return bp >= range.x && bp <= range.y;
}

void main() {
	float currBp = mix(displayedRange.x, displayedRange.y, coord.x);
	float currUv = currBp / (totalRange.y - totalRange.x);
	if (currUv < 0.0 || currUv >= 1.0 ) {
		gl_FragColor = vec4(0.0);
	} else {
		// Find the correct texture for the current base pair:
		vec2 uvInTex;
		vec4 finalColor;
		vec4 colorWithAlpha = vec4(1.0/0.05 * mod(currUv, 0.05) *color, 1.0);
		if (inRange(range0, currBp)) {
			uvInTex = vec2((currBp - range0.x) / (range0.y-range0.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture0, uvInTex), 0.5);
		} else if (inRange(range1, currBp)) {
			uvInTex = vec2((currBp - range1.x) / (range1.y-range1.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture1, uvInTex), 0.5);
		} else if (inRange(range2, currBp)) {
			uvInTex = vec2((currBp - range2.x) / (range2.y-range2.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture2, uvInTex), 0.5);
		} else if (inRange(range3, currBp)) {
			uvInTex = vec2((currBp - range3.x) / (range3.y-range3.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture3, uvInTex), 0.5);
		} else if (inRange(range4, currBp)) {
			uvInTex = vec2((currBp - range4.x) / (range4.y-range4.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture4, uvInTex), 0.5);
		} else if (inRange(range5, currBp)) {
			uvInTex = vec2((currBp - range5.x) / (range5.y-range5.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture5, uvInTex), 0.5);
		} else if (inRange(range6, currBp)) {
			uvInTex = vec2((currBp - range6.x) / (range6.y-range6.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture6, uvInTex), 0.5);
		} else if (inRange(range7, currBp)) {
			uvInTex = vec2((currBp - range7.x) / (range7.y-range7.x), 0.0);
			finalColor = mix(colorWithAlpha, texture2D(texture7, uvInTex), 0.5);
		} else {
			finalColor = vec4(0.0, 0.0, 1.0, 1.0);
		}
		gl_FragColor = finalColor;
	}
    
}