import { CHROMOSOME_START_BASE_PAIRS } from './constants';

class Util {

  static chromosomeNameToIndex(name) {
    const suffix = name.slice(3);
    if (suffix === "X") {
      return 22;
    } else if (suffix === "Y") {
      return 23;
    } else {
      return parseInt(suffix, 10) - 1;
    }
  }

  static chromosomeRelativeToUniversalBasePair(chr, bp) {
    const idx =
      typeof chr !== "string" ? chr - 1 : this.chromosomeNameToIndex(chr);
    return CHROMOSOME_START_BASE_PAIRS[idx] + bp;
  }

}

export default Util;
