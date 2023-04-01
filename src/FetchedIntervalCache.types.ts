import { Immutable, IntegerInterval, NumericValue } from './util'

/**
 * A function for constructing `IntegerInterval<N>`s. For example, `<IntervalFactory<number>>`
 * could be `(from: number, to: number) => new IntegerInterval(from, to)`.
 */
export type IntervalFactory<N extends NumericValue = number> = (
  from: number,
  to: number,
) => IntegerInterval<N>

/**
 * An array indicating which intervals and entry are included in a `FetchedIntervalCache`, and
 * which intervals still need to be fetched.
 */
export type IntervalData<E, N extends NumericValue = number> = Array<
  | { entries: Array<Immutable<E>>; interval: IntegerInterval<N> }
  | { interval: IntegerInterval<N>; missing: true }
>

export type IntervalDataCallback<E, N extends NumericValue = number> = (
  data: IntervalData<E, N>,
) => void

export type SubsequentEntryData<E, N extends NumericValue = number> =
  | { entry: Immutable<E> }
  | { missingInterval: IntegerInterval<N> }
  | { noValue: true }
