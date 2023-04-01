import { IntegerInterval, IntervalData, Minified, Minifier, Unminifier } from './index'

export type ExampleDbEntry = {
  id: number
  payload: string
}

export const interval0to5 = new IntegerInterval(0, 5)
export const entries0to5: Array<ExampleDbEntry> = [
  { id: 0, payload: 'The zeroth object' },
  { id: 1, payload: 'Another object' },
  { id: 4, payload: 'Looks like 2 and 3 were deleted. Five too.' },
]

export const interval6to7 = new IntegerInterval(6, 7)

export const interval10to15 = new IntegerInterval(10, 15)

export const interval23to28 = new IntegerInterval(23, 28)
export const entries23to28: Array<ExampleDbEntry> = [
  { id: 23, payload: 'Numba tweenty tree' },
  { id: 25, payload: 'A quarter of a dollar' },
  { id: 26, payload: '26' },
  { id: 28, payload: 'This is payload number twenty-eight.' },
]

export const missingInterval8to9 = new IntegerInterval(8, 9)
export const missingInterval16to22 = new IntegerInterval(16, 22)

export const data0to7 = { entries: entries0to5, interval: new IntegerInterval(0, 7) }
export const data8to9 = { interval: missingInterval8to9, missing: true }
export const data10to15 = { entries: [], interval: interval10to15 }
export const data16to22 = { interval: missingInterval16to22, missing: true }
export const data23to28 = { entries: entries23to28, interval: interval23to28 }

export const interval16to20 = new IntegerInterval(16, 20)
export const entries16to20: Array<ExampleDbEntry> = [
  { id: 16, payload: 'Sweet sixteen?' },
  { id: 18, payload: 'Eighteen - legal to vote' },
  { id: 19, payload: 'One niner' },
]

export const newEntry3: ExampleDbEntry = { id: 3, payload: "Three's a crowd, eh?" }
export const newEntry12: ExampleDbEntry = { id: 12, payload: 'A DOZEN' }

export const entries0to5WithNew = [entries0to5[0], entries0to5[1], newEntry3, entries0to5[2]]

export const interval3to13 = new IntegerInterval(3, 13)
export const entries3to13: Array<ExampleDbEntry> = [
  newEntry3,
  entries0to5[2],
  { id: 8, payload: 'Octagon' },
  { id: 9, payload: 'tree times tree' },
  newEntry12,
]

export const interval25to27 = new IntegerInterval(25, 27)
export const entries25to27: Array<ExampleDbEntry> = [
  { id: 26, payload: 'Twenty-six' },
  { id: 27, payload: '27' },
]

export const dataAfterInsert: IntervalData<ExampleDbEntry, number> = [
  {
    entries: [entries0to5[0], entries0to5[1], ...entries3to13, ...entries16to20],
    interval: new IntegerInterval(0, 20),
  },
  { interval: new IntegerInterval(21, 22), missing: true },
  {
    entries: [entries23to28[0], ...entries25to27, entries23to28[3]],
    interval: interval23to28,
  },
]

export const minifier: Minifier<ExampleDbEntry> = (entry: ExampleDbEntry) => {
  return { i: entry.id, p: entry.payload }
}
export const unminifier: Unminifier<ExampleDbEntry> = (minified: Minified) => {
  return {
    id: minified.i,
    payload: minified.p,
  }
}

export const minifiedCacheInitial = [
  {
    e: [
      { i: 0, p: 'The zeroth object' },
      { i: 1, p: 'Another object' },
      { i: 4, p: 'Looks like 2 and 3 were deleted. Five too.' },
    ],
    f: 0,
    t: 7,
  },
  { e: [], f: 10, t: 15 },
  {
    e: [
      { i: 23, p: 'Numba tweenty tree' },
      { i: 25, p: 'A quarter of a dollar' },
      { i: 26, p: '26' },
      { i: 28, p: 'This is payload number twenty-eight.' },
    ],
    f: 23,
    t: 28,
  },
]
export const minifiedCacheAfterInserts = [
  {
    e: [
      { i: 0, p: 'The zeroth object' },
      { i: 1, p: 'Another object' },
      { i: 3, p: "Three's a crowd, eh?" },
      { i: 4, p: 'Looks like 2 and 3 were deleted. Five too.' },
      { i: 8, p: 'Octagon' },
      { i: 9, p: 'tree times tree' },
      { i: 12, p: 'A DOZEN' },
      { i: 16, p: 'Sweet sixteen?' },
      { i: 18, p: 'Eighteen - legal to vote' },
      { i: 19, p: 'One niner' },
    ],
    f: 0,
    t: 20,
  },
  {
    e: [
      { i: 23, p: 'Numba tweenty tree' },
      { i: 26, p: 'Twenty-six' },
      { i: 27, p: '27' },
      { i: 28, p: 'This is payload number twenty-eight.' },
    ],
    f: 23,
    t: 28,
  },
]
