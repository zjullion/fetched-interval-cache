# Fetched Interval Cache

`fetched-interval-cache` is a [typescript](https://www.typescriptlang.org/) cache for storing ordered query data (typically fetched from a backend database).

## Motivation

In applications where a backend database stores ordered, unique data (such as timestamped data), the client will often fetch intervals of data. Consider the following scenario for a frontend (browser) client:

1. Fetch all entries from March 5 to March 17.
2. Next, fetch all entries from March 22 to March 24.
3. Next, fetch all entries from March 8 to March 12.
4. Finally, fetch all entries from March 5 to March 24.

Using a caching solution, _no_ backend query needs to be made for Step 3, and _only_ entries from March 18 to March 21 need to be fetched for Step 4 (which saves both network and database resources).

### Why not use an existing client-side cache / database?

Note: dates should be stored in [unix time](https://en.wikipedia.org/wiki/Unix_time), but are presented here in a human-readable format.

Consider a client-side database with the following entries:

| Date            | Information      |
| --------------- | ---------------- |
| March 5 @ 11:00 | Bought some eggs |
| March 6 @ 9:00  | Rode a bike      |
| March 9 @ 19:00 | Ate a pie        |

Has the client already requested data for March 7 & 8, but found no entries? Are there additional entries on March 5, 6, & 9?

By storing _intervals_ of data, `fetched-interval-cache` makes it easy to determine which data has been fetched (or not fetched):

| Interval            | Entries                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| March 5 to March 6  | + March 5 @ 11:00 : Bought some eggs <br> + March 6 @ 9:00 : Rode a bike |
| March 9 to March 11 | + March 9 @ 19:00 : Ate a pie                                            |

## Installation

```
npm install fetched-interval-cache
```

```
yarn add fetched-interval-cache
```

```
pnpm add fetched-interval-cache
```

## Usage

### Basic Example

```typescript
import { FetchedIntervalCache, IntegerInterval } from './index'

type Entry = {
  key: number
  payload: string
}

const sortKey = 'key'
const cache = FetchedIntervalCache.makeCache<Entry>(sortKey)

// In a real application, this data would come from a query to a backend database
const interval = new IntegerInterval(5, 11)
const entries: Entry[] = [
  { key: 6, payload: 'Payload for entry 6' },
  { key: 10, payload: 'This is ten.' },
  { key: 11, payload: 'Turn it up to 11!' },
]

cache.insertInterval(interval, entries)
```

### Core Concepts

An `IntegerInterval` is an immutable, inclusive, and discreet range between two integers - for example, `[5, 11]`. `IntegerIntervals` represent ranges that have been fetched from backend databases. These ranges could be unix timestamps, ids, etc.

A `FetchedIntervalCache` is a collection of `IntegerIntervals` with appropriate entries associated with each interval. Ranges of entries can be added via `insertInterval()`. Individual entries can be modified via `add()`, `delete()`, and `update()`. The functions `getEntries()`, `getNextEntry()`, and `getPreviousEntry()` return the data stored in the cache. Callback functions can be subscribed to the cache via `addListener()`. These functions will be invoked whenever the data in the interval they are subscribed to changes.

It is important to note that `-∞` and `∞` are valid from / to values for an `IntegerInterval`. Infinite values indicate that **all** possible entries in descending / ascending order (respectively) have been fetched. This ensures that additional queries to the backend database are not made when it is already clear that there is no more data to fetch.

### Docs

See [https://zjullion.github.io/fetched-interval-cache/](https://zjullion.github.io/fetched-interval-cache/)
