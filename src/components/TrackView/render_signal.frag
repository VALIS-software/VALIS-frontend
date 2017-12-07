precision mediump float;

varying vec2 coord;

uniform vec3 color;

uniform vec2 displayedRange; // range of genome currently displayed
uniform vec2 totalRange; // total range of the genome
uniform vec2 currentTileDisplayRange; // range of the tile that is displayed
uniform vec2 totalTileRange; // total range of the current tile
uniform float trackHeight;

uniform vec2 windowSize;
uniform vec2 selectionBoundsMin;
uniform vec2 selectionBoundsMax;
uniform int showSelection;

uniform sampler2D data;

uniform float tile;
uniform float selectedBasePair;

#define TICK_WIDTH 2500000.0
#define OTHER_BLUE_COLOR vec3(14.0/255.0, 116.0/255.0, 132.0/255.0)
#define BLUE_COLOR  vec3(0.0/255.0, 207.0/255.0, 251.0/255.0)
#define SMALL_TICK_HEIGHT 0.1

bool gridVisible(float currBp, float pixelsPerBp, float spacing, float thickness, float minSize) {
	float d = fract(currBp/spacing);
	float alpha = thickness / pixelsPerBp  / spacing;
	return ( (d > (1.0 - alpha) || d < alpha) && pixelsPerBp * spacing > minSize);
}

void main() {
	float currBp = mix(currentTileDisplayRange.x, currentTileDisplayRange.y, coord.x);
	float locInTile = (currBp - totalTileRange.x) / (totalTileRange.y - totalTileRange.x);
	vec3 dataValue = vec3(texture2D(data, vec2(locInTile, 0.0)).r);
	float bpPerPixel = (displayedRange.y - displayedRange.x) / windowSize.x;
	vec3 finalColor = mix(OTHER_BLUE_COLOR, BLUE_COLOR , coord.y);

	if (coord.y < dataValue.r) {
		finalColor = vec3(0.0);
	}
	vec3 tintColor = vec3(0.0);
	float pixelsPerBp = windowSize.x/(displayedRange.y - displayedRange.x);
	
	if (abs(selectedBasePair - currBp) < 1.0  / pixelsPerBp) {
		tintColor += vec3(0.5, 0.5, 0.5);
	}

	vec2 bMin = vec2(min(selectionBoundsMin.x, selectionBoundsMax.x), min(selectionBoundsMin.y, selectionBoundsMax.y));
	vec2 bMax = vec2(max(selectionBoundsMin.x, selectionBoundsMax.x), max(selectionBoundsMin.y, selectionBoundsMax.y));

	vec2 screenCoord =  gl_FragCoord.xy;
	screenCoord.y = windowSize.y - screenCoord.y;

	float selectionHighlight = 1.0;
	if (showSelection == 1 && screenCoord.x > bMin.x && screenCoord.x < bMax.x && screenCoord.y > bMin.y && screenCoord.y < bMax.y) {
		selectionHighlight = 1.5;
	}

	gl_FragColor = vec4(tintColor + finalColor * selectionHighlight, 1.0);	
}