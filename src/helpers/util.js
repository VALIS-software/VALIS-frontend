
class Util {
  static floorToMultiple(x, k) {
    return Math.round((x % k === 0) ? x :  x + k - x % k - k);
  }

  static ceilToMultiple(x, k) {
    return Math.round((x % k === 0) ? x :  x + k - x % k);
  }

  static discreteRangeContainingRange(range, discretizationSize) {
    const start = Util.floorToMultiple(range[0], discretizationSize);
    const end = Util.ceilToMultiple(range[1], discretizationSize);
    return [start, end];
  }

  static inRange(range, value) {
    return value >= range[0] && value <= range[1];
  }

  static rangesIntersect(range1, range2) {
    return Util.inRange(range1, range2[0]) || Util.inRange(range1, range2[1]);
  }
}

export default Util;
