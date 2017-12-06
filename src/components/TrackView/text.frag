precision highp float;
uniform sampler2D texture;
varying vec2 coord;
void main() {
	vec4 color = texture2D(texture, coord);
	if (color.a < 1.0) {
		color.r = color.r * (1.0 - color.a) + color.a;
		color.g = color.g * (1.0 - color.a) + color.a;
		color.b = color.b * (1.0 - color.a) + color.a;
		color.a = 1.0;
	}
	color.rgb = vec3(1.0) - color.rgb;
	gl_FragColor = color;
}