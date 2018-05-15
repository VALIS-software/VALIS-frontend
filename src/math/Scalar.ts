export class Scalar {

    static log2(x: number) {
        return Math.log(x) / Math.LN2;
    }

    static log10(x: number) {
        return Math.log(x) / Math.LN10;
    }

    static sign(x: number) {
        return (((x > 0) as any) - ((x < 0) as any)) || +x;
    }

}

export default Scalar;