export class Scalar {

    static clamp(x: number, min: number, max: number) {
        return Math.min(Math.max(x, min), max);
    }

    /**
     * Return 0 at x <= edge0, return 1 for x >= edge1 and linearly interpolate in-between
     */
    static linStep(edge0: number, edge1: number, x: number) {
        return Scalar.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    }

    // polyfill for ECMAScript 2015 Math methods

    static log2(x: number) {
        return Math.log(x) * Math.LOG2E;
    }

    static log10(x: number) {
        return Math.log(x) * Math.LOG10E;
    }

    static sign(x: number) {
        return (((x > 0) as any) - ((x < 0) as any)) || +x;
    }

}

export default Scalar;