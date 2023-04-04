# Fetched Interval Cache

`fetched-interval-cache` is a [typescript](https://www.typescriptlang.org/) cache for storing ordered query data (typically fetched from a backend database).

## Motivation

In applications where a backend database stores ordered, unique data (such as timestamped data), the client will often fetch intervals of data. Consider the following scenario for a frontend (browser) client:

1. Fetch all entries from March 5 to March 17.
2. Next, fetch all entries from April 8 to April 13.
3. Next, fetch all entries from March 8 to March 12.
4. Finally, fetch all entries from March 5 to April 13.

Using a caching solution, _no_ backend query needs to be made for Step 3, and _only_ entries from March 18 to April 7 need to be fetched for Step 4 (which saves both network and database resources).

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

```typescript
import { FetchedIntervalCache } from 'fetched-interval-cache`

type Entry = {
  key: number,
  payload: any
}

const soryKey = 'key'
const cache = FetchedIntervalCache.makeCache<Entry>(key)
```

Entries and intervals in [FetchedIntervalCache](src/FetchedIntervalCache.ts) are sorted by `sortKey`.
