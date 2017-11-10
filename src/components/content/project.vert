precision mediump float;

attribute vec2 points;
varying vec2 coord;
uniform vec2 pan;
uniform vec2 zoom;
uniform vec2 size;

void main() {
    coord = (points * vec2(1, -1) + 1.0) / 2.0 - pan * 1.0/size.xy;
    coord.x *= zoom.x;
    coord.y *= zoom.y;
    gl_Position = vec4(points, 0.0, 1.0);
}