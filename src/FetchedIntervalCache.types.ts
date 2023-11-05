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
export type IntervalData<EntryType, N extends NumericValue = number> = Array<
  | { entries: Array<Immutable<EntryType>>; interval: IntegerInterval<N> }
  | { interval: IntegerInterval<N>; missing: true }
>

/**
 * A callback / listener function that will be invoked when the associated interval changes.
 */
export type IntervalDataCallback<EntryType, N extends NumericValue = number> = (
  data: IntervalData<EntryType, N>,
) => void

/**
 * Data returned by `getNextEntry()` and `getPreviousEntry`.
 */
export type SubsequentEntryData<EntryType, N extends NumericValue = number> =
  | { entry: Immutable<EntryType> }
  | { missingInterval: IntegerInterval<N> }
  | { noValue: true }
