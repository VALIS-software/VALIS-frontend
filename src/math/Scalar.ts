export class Scalar {

    static clamp(x: number, min: number, max: number) {
        return Math.min(Math.max(x, min), max);
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