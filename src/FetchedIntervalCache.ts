import {
  IntervalData,
  IntervalDataCallback,
  IntervalFactory,
  SubsequentEntryData,
} from './FetchedIntervalCache.types'
import {
  Immutable,
  IntegerInterval,
  IsValidAttribute,
  Minified,
  Minifier,
  NumericValue,
  Unminifier,
} from './util'

/**
 * The index where a entry belongs in either a _FetchedInterval or a FetchedIntervalCache. If the
 * entry is already included in the FetchedIntervalCache, or if a entry with the exact value already
 * exists in the _FetchedInterval, `exists` is true. Otherwise, it is false.
 */
type _InsertLocation = {
  exists: boolean
  index: number
}

/**
 * A list of sorted, unique data over an inclusive interval. Sort values must be unique - entries
 * with identical sort values overwrite each other.
 */
class _FetchedInterval<E, N extends NumericValue = number> extends IntegerInterval<N> {
  private _entries: Array<Immutable<E>>
  private _sortKey: IsValidAttribute<E, N>

  constructor(
    sortKey: IsValidAttribute<E, N>,
    interval: IntegerInterval<N>,
    entries: Array<Immutable<E>>,
  ) {
    super(interval.from, interval.to)
    this._sortKey = sortKey
    this._entries = [...entries]
  }

  add(entry: Immutable<E>): boolean {
    const insertLocation = this._findInsertLocation(this._entryValue(entry))
    if (!insertLocation.exists) {
      this._entries.splice(insertLocation.index, 0, entry)
    }
    return !insertLocation.exists
  }

  delete(entry: Immutable<E | N> | number): Immutable<E> | null {
    const insertLocation = this._findInsertLocation(this._entryValue(entry))
    if (insertLocation.exists) {
      return this._entries.splice(insertLocation.index, 1)[0]
    }
    return null
  }

  update(entry: Immutable<E>): Immutable<E> | null {
    const insertLocation = this._findInsertLocation(this._entryValue(entry))
    if (insertLocation.exists) {
      return this._entries.splice(insertLocation.index, 1, entry)[0]
    }
    return null
  }

  getEntries(
    from: Immutable<N> | number,
    to: Immutable<N> | number,
    remove = false,
  ): Array<Immutable<E>> {
    if (this._entries.length === 0 || from > this.to || to < this.from) {
      return []
    }

    const fromIndex = from <= this.from ? 0 : this._findInsertLocation(from).index
    const toLocation =
      to >= this.to ? { exists: false, index: this._entries.length } : this._findInsertLocation(to)

    const method = remove ? 'splice' : 'slice'
    return this._entries[method](
      fromIndex,
      toLocation.exists ? toLocation.index + 1 : toLocation.index,
    )
  }

  minify(minifier: Minifier<E>) {
    return {
      e: this._entries.map((entry) => minifier(entry)),
      f: this.from.valueOf(),
      t: this.to.valueOf(),
    }
  }

  private _findInsertLocation(searchValue: Immutable<N> | number): _InsertLocation {
    /* istanbul ignore next: this is a safety net that should never occur */
    if (searchValue < this.from || searchValue > this.to) {
      throw new RangeError(`Sort value ${searchValue} is not within ${this}.`)
    }

    if (this._entries.length === 0) {
      return {
        exists: false,
        index: 0,
      }
    }

    let minIndex = 0
    let maxIndex = this._entries.length - 1

    while (minIndex <= maxIndex) {
      const currentIndex = Math.floor((maxIndex + minIndex) / 2)
      const currentValue = this._entryValue(this._entries[currentIndex])

      if (currentValue > searchValue) {
        maxIndex = currentIndex - 1
      } else if (currentValue < searchValue) {
        minIndex = currentIndex + 1
      } else if (currentValue === searchValue) {
        return { exists: true, index: currentIndex }
      }
    }

    return { exists: false, index: minIndex }
  }

  private _entryValue(entry: Immutable<E | N> | number): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IsValidAttribute<E, N> makes this safe
    const anyTypeEntry = entry as unknown as any
    return anyTypeEntry[this._sortKey]?.valueOf() ?? anyTypeEntry.valueOf()
  }
}

/**
 * A set of distinct (non-intersecting) IntegerIntervals, each containing sorted, unique data.
 * Each interval corresponds to one or more queries to a backend database.
 */
export class FetchedIntervalCache<E, N extends NumericValue = number> {
  private _intervalFactory: IntervalFactory<N>
  private _intervals: Array<_FetchedInterval<E, N>>
  private _listeners: Array<{
    callback: IntervalDataCallback<E, N>
    interval: IntegerInterval<N>
  }>
  private _sortKey: IsValidAttribute<E, N>

  public constructor(sortKey: IsValidAttribute<E, N>, intervalFactory: IntervalFactory<N>) {
    this._intervals = []
    this._listeners = []
    this._sortKey = sortKey
    this._intervalFactory = intervalFactory
  }

  public static makeCache<E>(
    sortKey: IsValidAttribute<E, number>,
  ): FetchedIntervalCache<E, number> {
    return new FetchedIntervalCache(
      sortKey,
      (from: number, to: number) => new IntegerInterval(from, to),
    )
  }

  /**
   * Constructs a FetchedIntervalCache from a minified value. `entryUnminifier` should throw an
   * error if passed a malformed or invalid minified entry.
   */
  static unminify<E, N extends NumericValue = number>(
    sortKey: IsValidAttribute<E, N>,
    entryUnminifier: Unminifier<E>,
    intervalFactory: IntervalFactory<N>,
    minified: Minified,
  ): FetchedIntervalCache<E, N> {
    const cache = new FetchedIntervalCache<E, N>(sortKey, intervalFactory)

    if (!Array.isArray(minified)) {
      throw new Error('Cannot unminify FetchedIntervalCache: minified is not an array.')
    }

    minified.forEach((fetchedInterval) => {
      const { e, f, t } = fetchedInterval
      if (e == null || !Array.isArray(e) || f == null || t == null) {
        throw new Error('Cannot unminify FetchedIntervalCache: malformed interval(s).')
      } else {
        try {
          const entries = e.map((entry: Minified) => entryUnminifier(entry))
          const interval = intervalFactory(f, t)
          cache.insertInterval(interval, entries as Array<Immutable<E>>)
        } catch (error) {
          throw new Error(`Cannot unminify FetchedIntervalCache: ${error}.`)
        }
      }
    })

    return cache
  }

  /**
   * Attempts to add the entry to the cache. `createInterval` indicates if a new interval will be
   * created if an appropriate one does not already exist. Returns true if the entry is added, and
   * false otherwise (including if another entry with the same sort key value already exists).
   * Appropriate callback(s) are invoked if the entry is added.
   */
  public add(entry: Immutable<E>, createInterval = false): boolean {
    const insertLocation = this._findInsertLocation(this._entryValue(entry))

    if (!insertLocation.exists) {
      if (!createInterval) {
        return false
      }
      const entryValue = this._entryValue(entry)
      this.insertInterval(this._intervalFactory(entryValue, entryValue), [entry])
    } else {
      const success = this._intervals[insertLocation.index].add(entry)
      if (!success) {
        return false
      }
    }

    this._listeners.forEach(({ callback, interval }) => {
      if (interval.includes(this._entryValue(entry))) {
        callback(this.getEntries(interval))
      }
    })

    return true
  }

  /**
   * Deletes the entry. Returns the entry if it existed, and null otherwise. Appropriate
   * callback(s) are invoked if the entry is deleted.
   */
  public delete(entry: Immutable<E | N | number>): Immutable<E> | null {
    const insertLocation = this._findInsertLocation(this._entryValue(entry))
    if (!insertLocation.exists) {
      return null
    }
    const deletedEntry = this._intervals[insertLocation.index].delete(entry)

    if (deletedEntry != null) {
      this._listeners.forEach(({ callback, interval }) => {
        if (interval.includes(this._entryValue(entry))) {
          callback(this.getEntries(interval))
        }
      })
    }

    return deletedEntry
  }

  /**
   * Updates the entry if it exists in the cache. Returns the old entry if it existed, and null
   * otherwise. Appropriate callback(s) are invoked if the entry is updated.
   */
  public update(entry: Immutable<E>): Immutable<E> | null {
    const insertLocation = this._findInsertLocation(this._entryValue(entry))
    if (!insertLocation.exists) {
      return null
    }
    const oldEntry = this._intervals[insertLocation.index].update(entry)

    if (oldEntry != null) {
      this._listeners.forEach(({ callback, interval }) => {
        if (interval.includes(this._entryValue(entry))) {
          callback(this.getEntries(interval))
        }
      })
    }

    return oldEntry
  }

  /**
   * Returns the entries in the provided interval, as well as the intervals that are not in
   * the cache (these should be subsequently fetched from the backend, so that the requested
   * interval can be completely filled in).
   */
  public getEntries(interval: IntegerInterval<N>): IntervalData<E, N> {
    const intervalData: IntervalData<E, N> = []

    this._iterateThroughIntervals(interval, {
      betweenIntervals: (emptyInterval) => {
        intervalData.push({ interval: emptyInterval, missing: true })
      },
      inInterval: (entriesInterval) => {
        const from = Math.max(entriesInterval.from.valueOf(), interval.from.valueOf())
        const to = Math.min(entriesInterval.to.valueOf(), interval.to.valueOf())
        intervalData.push({
          entries: entriesInterval.getEntries(from, to),
          interval: this._intervalFactory(from, to),
        })
      },
    })

    return intervalData
  }

  /**
   * Get the entry with a sort value greater than or equal to the value provided. Returns a
   * `missingInterval` if an appropriate entry is not found in the cache, but could exist. Returns
   * the entry if it is found. Returns `noValue` if all possible intervals have been fetched, and
   * no appropriate entry exists.
   */
  public getNextEntry(value: Immutable<E | N> | number): SubsequentEntryData<E, N> {
    const entryValue = this._entryValue(value)
    const insertLocation = this._findInsertLocation(entryValue)
    const { exists, index } = insertLocation

    if (!exists) {
      const from = (this._intervals[index - 1]?.to ?? entryValue - 1).valueOf() + 1
      const to = (this._intervals[index]?.from ?? Number.POSITIVE_INFINITY).valueOf() - 1
      return { missingInterval: this._intervalFactory(from, to) }
    }

    const interval = this._intervals[index]
    const entries = interval.getEntries(entryValue, Number.POSITIVE_INFINITY)

    if (entries.length !== 0) {
      return { entry: entries[0] as Immutable<E> }
    } else if (interval.to.valueOf() === Number.POSITIVE_INFINITY) {
      return { noValue: true }
    }

    const from = interval.to.valueOf() + 1
    const to = (this._intervals[index + 1]?.from ?? Number.POSITIVE_INFINITY).valueOf() - 1
    return { missingInterval: this._intervalFactory(from, to) }
  }

  /**
   * Get the entry with a sort value less than or equal to the value provided. Returns a
   * `missingInterval` if an appropriate entry is not found in the cache, but could exist. Returns
   * the entry if it is found. Returns `noValue` if all possible intervals have been fetched, and
   * no appropriate entry exists.
   */
  public getPreviousEntry(value: Immutable<E | N> | number): SubsequentEntryData<E, N> {
    const entryValue = this._entryValue(value)
    const insertLocation = this._findInsertLocation(entryValue)
    const { exists, index } = insertLocation

    if (!exists) {
      const from = (this._intervals[index - 1]?.to ?? Number.NEGATIVE_INFINITY).valueOf() + 1
      const to = (this._intervals[index]?.from ?? entryValue + 1).valueOf() - 1
      return { missingInterval: this._intervalFactory(from, to) }
    }

    const interval = this._intervals[index]
    const entries = interval.getEntries(Number.NEGATIVE_INFINITY, entryValue)

    if (entries.length !== 0) {
      return { entry: entries[entries.length - 1] as Immutable<E> }
    } else if (interval.from.valueOf() === Number.NEGATIVE_INFINITY) {
      return { noValue: true }
    }

    const from = (this._intervals[index - 1]?.to ?? Number.NEGATIVE_INFINITY).valueOf() + 1
    const to = interval.from.valueOf() - 1
    return { missingInterval: this._intervalFactory(from, to) }
  }

  /**
   * Adds a new interval of entries to the cache. Overlapping parts of existing intervals will be
   * overwritten. Throws an error if `entries` are not sorted ascending by sort key, or if any of
   * the `entries` have a duplicate sort value, or if any of the `entries` have a sort value
   * outside of the `insertInterval`. Appropriate callback(s) are invoked.
   */
  public insertInterval(insertInterval: IntegerInterval<N>, entries: Array<Immutable<E>>) {
    if (entries.length !== 0) {
      let currentValue = this._entryValue(entries[0])

      if (currentValue < insertInterval.from.valueOf()) {
        throw new RangeError(`Entries outside interval ${insertInterval.toString()} found.`)
      }

      for (let index = 1; index < entries.length; index++) {
        const nextValue = this._entryValue(entries[index])

        if (nextValue < currentValue) {
          throw new RangeError(`Entries are not sorted in ascending order by ${this._sortKey}.`)
        } else if (nextValue === currentValue) {
          throw new RangeError(`Multiple entries with same ${this._sortKey} found.`)
        }

        currentValue = nextValue
      }

      if (currentValue > insertInterval.to.valueOf()) {
        throw new RangeError(`Entries outside interval ${insertInterval.toString()} found.`)
      }
    }

    let from = insertInterval.from.valueOf()
    let to = insertInterval.to.valueOf()
    let fromLocation = this._findInsertLocation(insertInterval.from.valueOf())
    let toLocation = this._findInsertLocation(insertInterval.to.valueOf())

    const fromMinusOneLocation = this._findInsertLocation(from - 1)
    if (fromMinusOneLocation.exists) {
      from -= 1
      fromLocation = fromMinusOneLocation
    }

    const toPlusOneLocation = this._findInsertLocation(to + 1)
    if (toPlusOneLocation.exists) {
      to += 1
      toLocation = toPlusOneLocation
    }

    const searchInterval = this._intervalFactory(from, to)
    const newEntriesToInsert = new _FetchedInterval(this._sortKey, insertInterval, entries)
    const updatedEntries: Array<Immutable<E>> = []
    let numAbsorbedIntervals = 0

    this._iterateThroughIntervals(searchInterval, {
      betweenIntervals: (formerlyEmptyInterval) => {
        const newEntries = newEntriesToInsert.getEntries(
          formerlyEmptyInterval.from.valueOf(),
          formerlyEmptyInterval.to.valueOf(),
          true,
        )
        updatedEntries.push(...newEntries)
      },
      inInterval: (entriesInterval) => {
        numAbsorbedIntervals++

        if (entriesInterval.from < insertInterval.from) {
          const existingEntries = entriesInterval.getEntries(
            entriesInterval.from.valueOf(),
            insertInterval.from.valueOf() - 1,
          )
          updatedEntries.push(...existingEntries)
        }

        const newEntries = newEntriesToInsert.getEntries(
          entriesInterval.from.valueOf(),
          entriesInterval.to.valueOf(),
          true,
        )
        updatedEntries.push(...newEntries)

        if (entriesInterval.to > insertInterval.to) {
          const existingEntries = entriesInterval.getEntries(
            insertInterval.to.valueOf() + 1,
            entriesInterval.to.valueOf(),
          )
          updatedEntries.push(...existingEntries)
        }
      },
    })

    const finalInterval = new IntegerInterval<N>(
      fromLocation.exists ? this._intervals[fromLocation.index].from : insertInterval.from,
      toLocation.exists ? this._intervals[toLocation.index].to : insertInterval.to,
    )
    this._intervals.splice(
      fromLocation.index,
      numAbsorbedIntervals,
      new _FetchedInterval(this._sortKey, finalInterval, updatedEntries),
    )

    this._listeners.forEach(({ callback, interval }) => {
      if (interval.intersects(insertInterval)) {
        callback(this.getEntries(interval))
      }
    })
  }

  /**
   * "Subscribes" the callback function to the interval, such that the callback will be invoked
   * whenever there are changes to the interval. Throws an error if the callback provided is
   * already subscribed to an interval.
   */
  public addListener(interval: IntegerInterval<N>, callback: IntervalDataCallback<E, N>) {
    if (this._listeners.some((listener) => listener.callback === callback)) {
      throw new Error('A listener with the same callback already exists.')
    }

    const listener = { callback, interval }
    this._listeners.push(listener)
    callback(this.getEntries(interval))
  }

  /**
   * "Unsubscribes" the given callback function. Returns true if the given callback was
   * "subscribed" to an inteval, and false otherwise.
   */
  public removeListener(callback: IntervalDataCallback<E, N>) {
    for (let listenerIndex = 0; listenerIndex < this._listeners.length; listenerIndex++) {
      if (this._listeners[listenerIndex].callback === callback) {
        this._listeners.splice(listenerIndex, 1)
        return true
      }
    }
    return false
  }

  /**
   * Minifies this cache, so that it is smaller for `JSON.stringify()` or database insertion.
   */
  public minify(minifier: Minifier<E>) {
    return this._intervals.map((interval) => interval.minify(minifier))
  }

  private _findInsertLocation(value: Immutable<N> | number): _InsertLocation {
    if (this._intervals.length === 0) {
      return {
        exists: false,
        index: 0,
      }
    } else if (value < this._intervals[0].from) {
      return {
        exists: false,
        index: 0,
      }
    } else if (value > this._intervals[this._intervals.length - 1].to) {
      return {
        exists: false,
        index: this._intervals.length,
      }
    }

    let minIndex = 0
    let maxIndex = this._intervals.length - 1

    while (minIndex <= maxIndex) {
      const index = Math.floor((maxIndex + minIndex) / 2)
      const interval = this._intervals[index]

      if (interval.from > value) {
        maxIndex = index - 1
      } else if (interval.to < value) {
        minIndex = index + 1
      } else if (interval.includes(value.valueOf())) {
        return {
          exists: true,
          index,
        }
      }
    }

    return {
      exists: false,
      index: minIndex,
    }
  }

  /**
   * Iterates through the `_FetchedInterval`s and the empty intervals between `_FetchedInterval`s
   * in the cache from `iterationInterval.from` to `iterationInterval.to`.
   */
  private _iterateThroughIntervals(
    iterationInterval: IntegerInterval<N>,
    actions: {
      betweenIntervals: (emptyInterval: IntegerInterval<N>) => void
      inInterval: (entriesInterval: _FetchedInterval<E, N>) => void
    },
  ) {
    let currentValue = iterationInterval.from.valueOf()
    let currentLocation = this._findInsertLocation(currentValue)

    do {
      if (currentLocation.exists) {
        const currentInterval = this._intervals[currentLocation.index]
        actions.inInterval(currentInterval)
        currentValue = currentInterval.to.valueOf() + 1
        currentLocation = { exists: false, index: currentLocation.index + 1 }
      } else {
        if (currentLocation.index < this._intervals.length) {
          const nextInterval = this._intervals[currentLocation.index]

          if (nextInterval.from <= iterationInterval.to) {
            if (currentValue < nextInterval.from.valueOf()) {
              actions.betweenIntervals(
                this._intervalFactory(currentValue, nextInterval.from.valueOf() - 1),
              )
            }
            currentValue = nextInterval.from.valueOf()
            currentLocation = { exists: true, index: currentLocation.index }
            continue
          }
        }

        actions.betweenIntervals(
          this._intervalFactory(currentValue, iterationInterval.to.valueOf()),
        )
        break
      }
    } while (currentValue <= iterationInterval.to.valueOf())
  }

  private _entryValue(entry: Immutable<E | N> | number): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IsValidAttribute<E, N> makes this safe
    const anyTypeEntry = entry as unknown as any
    return anyTypeEntry[this._sortKey]?.valueOf() ?? anyTypeEntry.valueOf()
  }
}
