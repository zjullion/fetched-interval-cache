import {
  data0to7,
  data8to9,
  data10to15,
  data16to22,
  data23to28,
  dataAfterInsert,
  entries0to5,
  entries0to5WithNew,
  entries3to13,
  entries16to20,
  entries23to28,
  entries25to27,
  ExampleDbEntry,
  interval0to5,
  interval3to13,
  interval6to7,
  interval10to15,
  interval16to20,
  interval23to28,
  interval25to27,
  minifiedCacheAfterInserts,
  minifiedCacheInitial,
  minifier,
  missingInterval8to9,
  missingInterval16to22,
  newEntry3,
  newEntry12,
  unminifier,
} from './FetchedIntervalCache.fixture'
import { FetchedIntervalCache, IntegerInterval, Minified } from './index'

const expectCalls = (fn: jest.SpyInstance, calls: Array<Array<unknown>>) => {
  expect(fn).toBeCalledTimes(calls.length)
  for (let callIndex = 0; callIndex < calls.length; callIndex++) {
    expect(fn.mock.calls[callIndex]).toEqual(calls[callIndex])
  }
}

describe('FetchedIntervalCache', () => {
  const intervalFactory = (from: number, to: number) => new IntegerInterval(from, to)
  let cache = new FetchedIntervalCache<ExampleDbEntry>('id', intervalFactory)

  beforeEach(() => {
    cache = new FetchedIntervalCache<ExampleDbEntry>('id', intervalFactory)
    cache.insertInterval(interval23to28, entries23to28)
    cache.insertInterval(interval0to5, entries0to5)
    cache.insertInterval(interval10to15, [])
    cache.insertInterval(interval6to7, [])
  })

  describe('makeCache', () => {
    it('returns a cache as expected', () => {
      const otherCache = FetchedIntervalCache.makeCache('id')
      otherCache.insertInterval(interval23to28, entries23to28)
      otherCache.insertInterval(interval0to5, entries0to5)
      otherCache.insertInterval(interval10to15, [])
      otherCache.insertInterval(interval6to7, [])

      expect(JSON.stringify(cache)).toBe(JSON.stringify(otherCache))
    })
  })

  describe('getNumIntervals() and getNumEntries()', () => {
    it('returns the expected values', () => {
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(7)
    })
  })

  describe('getEntries()', () => {
    it('returns the entries and missing intervals in the interval provided', () => {
      expect(cache.getEntries(new IntegerInterval(0, 7))).toStrictEqual([data0to7])
      expect(cache.getEntries(interval10to15)).toStrictEqual([data10to15])
      expect(cache.getEntries(interval23to28)).toStrictEqual([data23to28])

      expect(cache.getEntries(new IntegerInterval(-4, 26))).toStrictEqual([
        { interval: new IntegerInterval(-4, -1), missing: true },
        data0to7,
        data8to9,
        data10to15,
        data16to22,
        {
          entries: [entries23to28[0], entries23to28[1], entries23to28[2]],
          interval: new IntegerInterval(23, 26),
        },
      ])

      expect(cache.getEntries(new IntegerInterval(3, 33))).toStrictEqual([
        { entries: [entries0to5[2]], interval: new IntegerInterval(3, 7) },
        data8to9,
        data10to15,
        data16to22,
        data23to28,
        { interval: new IntegerInterval(29, 33), missing: true },
      ])
    })
  })

  describe('getNextEntry() and getPreviousEntry()', () => {
    it('returns the appropriate entry if it exists', () => {
      expect(cache.getNextEntry(entries0to5[0])).toStrictEqual({ entry: entries0to5[0] })
      expect(cache.getNextEntry(3)).toStrictEqual({ entry: entries0to5[2] })
      expect(cache.getNextEntry(entries23to28[0])).toStrictEqual({ entry: entries23to28[0] })
      expect(cache.getNextEntry(27)).toStrictEqual({ entry: entries23to28[3] })

      expect(cache.getPreviousEntry(entries23to28[3])).toStrictEqual({ entry: entries23to28[3] })
      expect(cache.getPreviousEntry(24)).toStrictEqual({ entry: entries23to28[0] })
      expect(cache.getPreviousEntry(5)).toStrictEqual({ entry: entries0to5[2] })
      expect(cache.getPreviousEntry(entries0to5[0])).toStrictEqual({ entry: entries0to5[0] })
    })

    it('returns a missingInterval if some interval(s) have not been fetched', () => {
      expect(cache.getNextEntry(-9)).toStrictEqual({ missingInterval: new IntegerInterval(-9, -1) })
      expect(cache.getNextEntry(5)).toStrictEqual({ missingInterval: missingInterval8to9 })
      expect(cache.getNextEntry(newEntry12)).toStrictEqual({
        missingInterval: missingInterval16to22,
      })
      expect(cache.getNextEntry(29)).toStrictEqual({
        missingInterval: new IntegerInterval(29, Number.POSITIVE_INFINITY),
      })

      expect(cache.getPreviousEntry(1337)).toStrictEqual({
        missingInterval: new IntegerInterval(29, 1337),
      })
      expect(cache.getPreviousEntry(22)).toStrictEqual({
        missingInterval: missingInterval16to22,
      })
      expect(cache.getPreviousEntry(newEntry12)).toStrictEqual({
        missingInterval: missingInterval8to9,
      })
      expect(cache.getPreviousEntry(-1)).toStrictEqual({
        missingInterval: new IntegerInterval(Number.NEGATIVE_INFINITY, -1),
      })

      cache.insertInterval(new IntegerInterval(29, 29), [])
      expect(cache.getNextEntry(29)).toStrictEqual({
        missingInterval: new IntegerInterval(30, Number.POSITIVE_INFINITY),
      })

      cache.insertInterval(new IntegerInterval(-1, -1), [])
      expect(cache.getPreviousEntry(-1)).toStrictEqual({
        missingInterval: new IntegerInterval(Number.NEGATIVE_INFINITY, -2),
      })
    })

    it('returns noValue if all relevant intervals have been fetched and an entry is not found', () => {
      cache.insertInterval(new IntegerInterval(Number.NEGATIVE_INFINITY, -1), [])
      cache.insertInterval(new IntegerInterval(29, Number.POSITIVE_INFINITY), [])

      expect(cache.getNextEntry(99)).toStrictEqual({ noValue: true })
      expect(cache.getNextEntry(Number.MAX_SAFE_INTEGER)).toStrictEqual({ noValue: true })
      expect(cache.getNextEntry(Number.POSITIVE_INFINITY)).toStrictEqual({ noValue: true })

      expect(cache.getPreviousEntry(-99)).toStrictEqual({ noValue: true })
      expect(cache.getPreviousEntry(Number.MIN_SAFE_INTEGER)).toStrictEqual({ noValue: true })
      expect(cache.getPreviousEntry(Number.NEGATIVE_INFINITY)).toStrictEqual({ noValue: true })
    })
  })

  describe('add()', () => {
    it('does not add entries that do not fit in any of the intervals by default', () => {
      for (const entry of entries16to20) {
        expect(cache.add(entry)).toBe(false)
      }

      expect(cache.getEntries(interval16to20)).toStrictEqual([
        { interval: interval16to20, missing: true },
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(7)
    })

    it('creates new intervals (or expands existing ones) for entries that do not fit if `createInterval=true`', () => {
      expect(cache.add(entries16to20[0], true)).toBe(true)
      expect(cache.add(entries3to13[2], true)).toBe(true)

      expect(cache.getEntries(new IntegerInterval(0, 22))).toStrictEqual([
        { entries: [...entries0to5, entries3to13[2]], interval: new IntegerInterval(0, 8) },
        { interval: new IntegerInterval(9, 9), missing: true },
        { entries: [entries16to20[0]], interval: new IntegerInterval(10, 16) },
        { interval: new IntegerInterval(17, 22), missing: true },
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(9)
    })

    it('adds new entries that fit an interval', () => {
      expect(cache.add(newEntry3)).toBe(true)
      expect(cache.add(newEntry12)).toBe(true)

      expect(cache.getEntries(new IntegerInterval(0, 15))).toStrictEqual([
        { entries: entries0to5WithNew, interval: data0to7.interval },
        data8to9,
        { entries: [newEntry12], interval: data10to15.interval },
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(9)
    })

    it('does nothing if existing entries with the same value already exist', () => {
      expect(cache.add({ ...entries0to5[0], payload: 'A new payload' })).toBe(false)

      expect(cache.getEntries(interval0to5)).toStrictEqual([
        { entries: entries0to5, interval: interval0to5 },
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(7)
    })
  })

  describe('delete()', () => {
    it('returns null if the entry does not exist', () => {
      expect(cache.delete(newEntry3)).toBe(null)
      expect(cache.delete(newEntry12)).toBe(null)
      for (const entry of entries16to20) {
        expect(cache.delete(entry)).toBe(null)
      }

      expect(cache.getEntries(new IntegerInterval(0, 22))).toStrictEqual([
        data0to7,
        data8to9,
        data10to15,
        data16to22,
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(7)
    })

    it('deletes the entry and returns the old entry if the entry existed', () => {
      const entry0 = entries0to5[0]
      const entry28 = entries23to28[3]

      expect(cache.delete(entry0)).toStrictEqual(entry0)
      expect(cache.delete(28)).toStrictEqual(entry28)

      expect(cache.getEntries(interval0to5)).toStrictEqual([
        {
          entries: entries0to5.slice(1),
          interval: interval0to5,
        },
      ])
      expect(cache.getEntries(interval23to28)).toStrictEqual([
        {
          entries: entries23to28.slice(0, 3),
          interval: interval23to28,
        },
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(5)

      expect(cache.delete(0)).toBe(null)
      expect(cache.delete(entry28)).toBe(null)
    })
  })

  describe('update()', () => {
    it('does nothing and returns null if the entry did not exist', () => {
      expect(cache.update(newEntry3)).toBe(null)
      expect(cache.update(newEntry12)).toStrictEqual(null)
      for (const entry of entries16to20) {
        expect(cache.update(entry)).toBe(null)
      }

      expect(cache.getEntries(new IntegerInterval(0, 22))).toStrictEqual([
        data0to7,
        data8to9,
        data10to15,
        data16to22,
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(7)
    })

    it('updates existing entries with the same value, and returns the old entry', () => {
      const updatedEntry0 = { ...entries0to5[0], payload: 'A new payload' }
      const updatedEntry28 = { ...entries23to28[3], payload: 'Something new' }

      expect(cache.update(updatedEntry0)).toStrictEqual(entries0to5[0])
      expect(cache.update(updatedEntry28)).toStrictEqual(entries23to28[3])

      expect(cache.getEntries(interval0to5)).toStrictEqual([
        {
          entries: [updatedEntry0, ...entries0to5.slice(1)],
          interval: interval0to5,
        },
      ])
      expect(cache.getEntries(interval23to28)).toStrictEqual([
        {
          entries: [...entries23to28.slice(0, 3), updatedEntry28],
          interval: interval23to28,
        },
      ])
      expect(cache.getNumIntervals()).toBe(3)
      expect(cache.getNumEntries()).toBe(7)
    })
  })

  describe('insertInterval()', () => {
    it('throws an error if the entries are not sorted in ascending order', () => {
      expect(() => cache.insertInterval(interval0to5, [entries0to5[1], entries0to5[0]])).toThrow(
        new RangeError('Entries are not sorted in ascending order by id.'),
      )
    })

    it('throws an error if any of the entries have the same sort value', () => {
      expect(() => cache.insertInterval(interval0to5, [entries0to5[0], entries0to5[0]])).toThrow(
        new RangeError('Multiple entries with same id found.'),
      )
    })

    it('throw an error if any of the entries are outside of the provided interval', () => {
      expect(() => cache.insertInterval(interval10to15, entries0to5)).toThrow(
        new RangeError(`Entries outside interval ${interval10to15.toString()} found.`),
      )
      expect(() => cache.insertInterval(interval0to5, entries23to28)).toThrow(
        new RangeError(`Entries outside interval ${interval0to5.toString()} found.`),
      )
    })

    it('inserts the new entries, replacing overlapping parts of existing intervals', () => {
      cache.insertInterval(interval3to13, entries3to13)
      cache.insertInterval(interval16to20, entries16to20)
      cache.insertInterval(interval25to27, entries25to27)

      expect(cache.getEntries(new IntegerInterval(0, 28))).toStrictEqual(dataAfterInsert)
      expect(cache.getNumIntervals()).toBe(2)
      expect(cache.getNumEntries()).toBe(14)
    })
  })

  describe('Listeners', () => {
    let callback0to5 = jest.fn()
    let callback0to15 = jest.fn()
    let callback20to28 = jest.fn()

    beforeEach(() => {
      callback0to5 = jest.fn()
      callback0to15 = jest.fn()
      callback20to28 = jest.fn()

      cache.addListener(interval0to5, callback0to5)
      cache.addListener(new IntegerInterval(0, 15), callback0to15)
      cache.addListener(new IntegerInterval(20, 28), callback20to28)
    })

    const firstInvoke0to5 = [{ entries: entries0to5, interval: interval0to5 }]
    const firstInvoke0to15 = [data0to7, data8to9, data10to15]
    const firstInvoke20to28 = [{ interval: new IntegerInterval(20, 22), missing: true }, data23to28]

    it('throws an error if the callback function has already been subscribed', () => {
      expect(() => cache.addListener(interval0to5, callback0to5)).toThrow(
        new Error('A listener with the same callback already exists.'),
      )
      expect(() => cache.addListener(interval16to20, callback0to15)).toThrow(
        new Error('A listener with the same callback already exists.'),
      )
      expect(() => cache.addListener(interval3to13, callback20to28)).toThrow(
        new Error('A listener with the same callback already exists.'),
      )
    })

    it('invokes the callback as soon as it is added', () => {
      expectCalls(callback0to5, [[firstInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28]])
    })

    it('invokes the appropriate callback(s) when entries are added', () => {
      cache.add(newEntry3)
      const secondInvoke0to5 = [{ entries: entries0to5WithNew, interval: interval0to5 }]
      const secondInvoke0to15 = [
        { entries: entries0to5WithNew, interval: data0to7.interval },
        data8to9,
        data10to15,
      ]

      expectCalls(callback0to5, [[firstInvoke0to5], [secondInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15], [secondInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28]])

      cache.add(entries25to27[1])
      const secondInvoke20to28 = [
        { interval: new IntegerInterval(20, 22), missing: true },
        {
          entries: [
            entries23to28[0],
            entries23to28[1],
            entries23to28[2],
            entries25to27[1],
            entries23to28[3],
          ],
          interval: interval23to28,
        },
      ]

      expectCalls(callback0to5, [[firstInvoke0to5], [secondInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15], [secondInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28], [secondInvoke20to28]])

      cache.add(newEntry12)
      const thirdInvoke0to15 = [
        { entries: entries0to5WithNew, interval: data0to7.interval },
        data8to9,
        { entries: [newEntry12], interval: interval10to15 },
      ]

      expectCalls(callback0to5, [[firstInvoke0to5], [secondInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15], [secondInvoke0to15], [thirdInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28], [secondInvoke20to28]])
    })

    it('invokes the appropriate callback(s) when entries are deleted', () => {
      cache.delete(entries0to5[0])
      const secondInvoke0to5 = [{ entries: entries0to5.slice(1), interval: interval0to5 }]
      const secondInvoke0to15 = [
        { entries: entries0to5.slice(1), interval: data0to7.interval },
        data8to9,
        data10to15,
      ]

      expectCalls(callback0to5, [[firstInvoke0to5], [secondInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15], [secondInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28]])

      cache.delete(entries23to28[3])
      const secondInvoke20to28 = [
        { interval: new IntegerInterval(20, 22), missing: true },
        { entries: entries23to28.slice(0, 3), interval: interval23to28 },
      ]

      expectCalls(callback0to5, [[firstInvoke0to5], [secondInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15], [secondInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28], [secondInvoke20to28]])
    })

    it('invokes the appropriate callback(s) when entries are updated', () => {
      const updatedEntry0 = { ...entries0to5[0], payload: 'A new payload' }
      const updatedEntry28 = { ...entries23to28[3], payload: 'Something new' }

      cache.update(updatedEntry0)
      const secondInvoke0to5 = [
        { entries: [updatedEntry0, ...entries0to5.slice(1)], interval: interval0to5 },
      ]
      const secondInvoke0to15 = [
        { entries: [updatedEntry0, ...entries0to5.slice(1)], interval: data0to7.interval },
        data8to9,
        data10to15,
      ]

      expectCalls(callback0to5, [[firstInvoke0to5], [secondInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15], [secondInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28]])

      cache.update(updatedEntry28)
      const secondInvoke20to28 = [
        { interval: new IntegerInterval(20, 22), missing: true },
        {
          entries: [...entries23to28.slice(0, 3), updatedEntry28],
          interval: interval23to28,
        },
      ]

      expectCalls(callback0to5, [[firstInvoke0to5], [secondInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15], [secondInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28], [secondInvoke20to28]])
    })

    it('invokes the appropriate callback(s) when new intervals are added', () => {
      cache.insertInterval(interval16to20, entries16to20)
      const secondInvoke20to28 = [
        { entries: [], interval: new IntegerInterval(20, 20) },
        dataAfterInsert[1],
        data23to28,
      ]

      expectCalls(callback0to5, [[firstInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28], [secondInvoke20to28]])

      cache.insertInterval(interval25to27, entries25to27)
      const thirdInvoke20to28 = [
        { entries: [], interval: new IntegerInterval(20, 20) },
        dataAfterInsert[1],
        dataAfterInsert[2],
      ]

      expectCalls(callback0to5, [[firstInvoke0to5]])
      expectCalls(callback0to15, [[firstInvoke0to15]])
      expectCalls(callback20to28, [[firstInvoke20to28], [secondInvoke20to28], [thirdInvoke20to28]])
    })

    it('allows callbacks to be removed, and does not invoke them after they are removed', () => {
      callback0to5.mockClear()
      callback0to15.mockClear()
      callback20to28.mockClear()

      expect(cache.removeListener(callback0to5)).toBe(true)
      expect(cache.removeListener(callback0to15)).toBe(true)
      expect(cache.removeListener(callback20to28)).toBe(true)

      expect(cache.removeListener(jest.fn())).toBe(false)
      expect(cache.removeListener(callback0to5)).toBe(false)
      expect(cache.removeListener(callback0to15)).toBe(false)
      expect(cache.removeListener(callback20to28)).toBe(false)

      cache.add(newEntry3)
      cache.add(newEntry12)
      cache.insertInterval(interval3to13, entries3to13)
      cache.insertInterval(interval25to27, entries25to27)

      expect(callback0to5).not.toBeCalled()
      expect(callback0to15).not.toBeCalled()
      expect(callback20to28).not.toBeCalled()
    })
  })

  describe('minification', () => {
    it('minifies the cache', () => {
      expect(cache.minify(minifier)).toStrictEqual(minifiedCacheInitial)

      cache.insertInterval(interval16to20, entries16to20)
      cache.insertInterval(interval25to27, entries25to27)
      cache.insertInterval(interval3to13, entries3to13)

      expect(cache.minify(minifier)).toStrictEqual(minifiedCacheAfterInserts)
    })

    it('throws an error if passed an arbitrary object', () => {
      expect(() => {
        FetchedIntervalCache.unminify('id', unminifier, intervalFactory, { invalid: true })
      }).toThrow(new Error('Cannot unminify FetchedIntervalCache: minified is not an array.'))

      const malformedMinifiedCaches: Array<Minified> = [
        [{ foo: 'bar' }],
        [{ e: 'this is not an array!' }],
        [{ e: [] }],
        [{ e: [], f: false }],
      ]
      malformedMinifiedCaches.forEach((minifiedCache) => {
        expect(() => {
          FetchedIntervalCache.unminify('id', unminifier, intervalFactory, minifiedCache)
        }).toThrow(new Error('Cannot unminify FetchedIntervalCache: malformed interval(s).'))
      })
    })

    it('throws an error if passed a FetchedIntervalCache with invalid values', () => {
      const invalidMinfiedCache = [{ e: [{ invalid: true }], f: 'this is not a number', t: true }]

      expect(() => {
        FetchedIntervalCache.unminify('id', unminifier, intervalFactory, invalidMinfiedCache)
      }).toThrow(
        new Error(
          "Cannot unminify FetchedIntervalCache: TypeError: From value 'this is not a number' is not valid..",
        ),
      )
    })

    it('returns a FetchedIntervalCache if passed a valid minified cache', () => {
      expect(
        FetchedIntervalCache.unminify('id', unminifier, intervalFactory, minifiedCacheInitial),
      ).toStrictEqual(cache)

      cache.insertInterval(interval16to20, entries16to20)
      cache.insertInterval(interval25to27, entries25to27)
      cache.insertInterval(interval3to13, entries3to13)

      expect(
        FetchedIntervalCache.unminify('id', unminifier, intervalFactory, minifiedCacheAfterInserts),
      ).toStrictEqual(cache)
    })
  })
})
