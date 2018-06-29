import { CHROMOSOME_START_BASE_PAIRS } from './constants';
const d3Format = require("d3-format");

const formatSi = d3Format.format(".6s");

class Util {
  static chromosomeIndexToName(chromosomeIdx) {
    if (chromosomeIdx <= 21) {
      return "" + (chromosomeIdx + 1);
    } else if (chromosomeIdx === 22) {
      return "X";
    } else if (chromosomeIdx === 23) {
      return "Y";
    }
    return null;
  }

  static chromosomeIndex(absoluteBasePair) {
    // determine which chromosome this point falls within
    for (let i = 1; i < CHROMOSOME_START_BASE_PAIRS.length; i++) {
      const regionEnd = CHROMOSOME_START_BASE_PAIRS[i];
      if (absoluteBasePair <= regionEnd) {
        return i - 1;
      }
    }
    return null;
  }

  static chromosomeRelativeBasePair(absoluteBasePair) {
    const chromosomeIndex = this.chromosomeIndex(absoluteBasePair);
    if (chromosomeIndex == null) {
      return null;
    } else {
      return {
        chromosomeIndex: chromosomeIndex,
        basePair:
          absoluteBasePair - CHROMOSOME_START_BASE_PAIRS[chromosomeIndex]
      };
    }
  }

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

  static floorToMultiple(x, k) {
    return Math.round(x % k === 0 ? x : x + k - x % k - k);
  }

  static ceilToMultiple(x, k) {
    return Math.round(x % k === 0 ? x : x + k - x % k);
  }

  static floorToClosestPower(x, k) {
    return Math.floor(Math.pow(k, Math.floor(Math.log(x) / Math.log(k))));
  }

  static discreteRangeContainingRange(range, discretizationSize) {
    const start = Util.floorToMultiple(range[0], discretizationSize);
    const end = Util.ceilToMultiple(range[1], discretizationSize);
    return [start, end];
  }

  static roundToHumanReadable(x) {
    const s = formatSi(x);
    switch (s[s.length - 1]) {
      case "G":
        return s.slice(0, -1) + "B";
      default:
        return s;
    }
  }
}

export default Util;
