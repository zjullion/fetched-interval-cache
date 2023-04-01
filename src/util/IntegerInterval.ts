import { NumericValue } from './util.types'

const _isValid = (num: number) => {
  return (
    Number.isInteger(num) || num === Number.NEGATIVE_INFINITY || num === Number.POSITIVE_INFINITY
  )
}

/**
 * An immutable, inclusive, and discreet range between two integers.
 */
export class IntegerInterval<N extends NumericValue = number> {
  private _from: N
  private _to: N

  public constructor(from: N, to: N) {
    this._from = from
    this._to = to

    if (!_isValid(from.valueOf())) {
      throw new TypeError(`From value '${from}' is not valid.`)
    } else if (!_isValid(to.valueOf())) {
      throw new TypeError(`To value '${to}' is not valid.`)
    } else if (from > to) {
      throw new RangeError(`From value '${from}' is greater than to value '${to}'.`)
    }
  }

  public get from() {
    return this._from
  }

  public get to() {
    return this._to
  }

  public includes(value: N | number): boolean {
    return value >= this._from && value <= this._to
  }

  public intersects(other: IntegerInterval<N>): boolean {
    return !(this.from > other.to || this.to < other.from)
  }

  public toString() {
    return `${this._from} to ${this._to}`
  }
}
