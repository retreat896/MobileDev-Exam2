
export default class Filter {
  static __workletClass = true;

  constructor(upper, lower) {
    this.upper = upper;
    this.lower = lower;
    this.format = null;
  }

  valueOf() {
    return `${this.format}|${this.upper}|${this.lower}`;
  }
}
