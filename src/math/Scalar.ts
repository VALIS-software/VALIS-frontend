export class Scalar {

    static log2(x: number) {
        return Math.log(x) * Math.LOG2E;
    }

    static log10(x: number) {
        return Math.log(x) * Math.LOG10E;
    }

    static sign(x: number) {
        return (((x > 0) as any) - ((x < 0) as any)) || +x;
    }

    static clamp(x: number, min: number, max: number) {
        return Math.min(Math.max(x, min), max);
    }

    // convert a number to a fixed point representation by truncating instead of rounding
    static toFixedTrunc(x: number, decimalPoints: number): string {
        let str = x.toString();
        let pattern = /(\d+)(\.(\d*))?(.*)/;
        let result = pattern.exec(str);
        let integerPart = result[1];
        let fractionalPart = result[3];
        let trailingCharacters = result[4];

        // truncate fractional part to show just 'decimalPoints' numbers
        let fractionString = (fractionalPart || '').substring(0, decimalPoints);
        // right-pad with 0s
        for (let i = fractionString.length; i < decimalPoints; i++) {
            fractionString += '0';
        }

        // recompose number
        return integerPart + (fractionString.length > 0 ? '.' + fractionString : '') + trailingCharacters;
    }

}

export default Scalar;