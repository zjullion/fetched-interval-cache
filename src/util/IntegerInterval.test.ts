import { IntegerInterval } from './index'

describe('IntegerInterval', () => {
  it('throws an error if initialized with invalid values', () => {
    expect(() => new IntegerInterval(2.25, 5)).toThrow(
      new TypeError("From value '2.25' is not valid."),
    )
    expect(() => new IntegerInterval(2, 5.78)).toThrow(
      new TypeError("To value '5.78' is not valid."),
    )
  })

  it("throws an error if 'from' is after 'to'", () => {
    expect(() => new IntegerInterval(11, 5)).toThrow(
      new RangeError("From value '11' is greater than to value '5'."),
    )
    expect(() => new IntegerInterval(99, -99)).toThrow(
      new RangeError("From value '99' is greater than to value '-99'."),
    )
    expect(() => new IntegerInterval(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toThrow(
      new RangeError("From value 'Infinity' is greater than to value '-Infinity'."),
    )
  })

  it('returns correct values', () => {
    const intervalA = new IntegerInterval(5, 15)
    expect(intervalA.from).toBe(5)
    expect(intervalA.to).toBe(15)
    expect(intervalA.toString()).toBe('5 to 15')

    const intervalB = new IntegerInterval(Number.NEGATIVE_INFINITY, 1337)
    expect(intervalB.from).toBe(Number.NEGATIVE_INFINITY)
    expect(intervalB.to).toBe(1337)
    expect(intervalB.toString()).toBe('-Infinity to 1337')
  })

  it('indicates if a value is included in an interval', () => {
    const intervalA = new IntegerInterval(5, 10)
    expect(intervalA.includes(7)).toBe(true)
    expect(intervalA.includes(5)).toBe(true)
    expect(intervalA.includes(10)).toBe(true)
    expect(intervalA.includes(4)).toBe(false)
    expect(intervalA.includes(11)).toBe(false)

    const intervalB = new IntegerInterval(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
    expect(intervalB.includes(Number.POSITIVE_INFINITY)).toBe(true)
    expect(intervalB.includes(Number.NEGATIVE_INFINITY)).toBe(false)
    expect(intervalB.includes(0)).toBe(false)
  })

  it('indicates if one interval intersects another', () => {
    const intervalA = new IntegerInterval(11, 21)
    const intervalB = new IntegerInterval(23, 23)
    const intervalC = new IntegerInterval(21, 38)

    expect(intervalA.intersects(intervalA)).toBe(true)
    expect(intervalB.intersects(intervalB)).toBe(true)
    expect(intervalC.intersects(intervalC)).toBe(true)

    expect(intervalA.intersects(intervalB)).toBe(false)
    expect(intervalB.intersects(intervalA)).toBe(false)

    expect(intervalA.intersects(intervalC)).toBe(true)
    expect(intervalB.intersects(intervalC)).toBe(true)
    expect(intervalC.intersects(intervalA)).toBe(true)
    expect(intervalC.intersects(intervalB)).toBe(true)
  })
})
