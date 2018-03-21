precision mediump float;

varying vec2 coord;

uniform vec3 color;

uniform vec2 displayedRange; // range of genome currently displayed
uniform vec2 totalRange; // total range of the genome
uniform vec2 currentTileDisplayRange; // range of the tile that is displayed
uniform vec2 totalTileRange; // total range of the current tile

uniform vec2 windowSize;
uniform vec2 selectionBoundsMin;
uniform vec2 selectionBoundsMax;
uniform int showSelection;

uniform sampler2D data;

uniform float tile;

#define TICK_WIDTH 2500000.0


void main() {
	float currBp = mix(currentTileDisplayRange.x, currentTileDisplayRange.y, coord.x);
	float locInTile = (currBp - totalTileRange.x) / (totalTileRange.y - totalTileRange.x);
	vec3 dataValue = vec3(texture2D(data, vec2(locInTile, 0.0)).r);
	
	vec2 bMin = vec2(min(selectionBoundsMin.x, selectionBoundsMax.x), min(selectionBoundsMin.y, selectionBoundsMax.y));
	vec2 bMax = vec2(max(selectionBoundsMin.x, selectionBoundsMax.x), max(selectionBoundsMin.y, selectionBoundsMax.y));

	vec2 screenCoord =  gl_FragCoord.xy;
	screenCoord.y = windowSize.y - screenCoord.y;

	float selectionHighlight = 1.0;
	if (showSelection == 1 && screenCoord.x > bMin.x && screenCoord.x < bMax.x && screenCoord.y > bMin.y && screenCoord.y < bMax.y) {
		selectionHighlight = 1.5;
	}

	gl_FragColor = vec4(dataValue * selectionHighlight, 1.0);	
}