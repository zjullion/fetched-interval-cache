// eslint-disable-next-line @typescript-eslint/ban-types
type _ImmutablePrimitive = undefined | null | boolean | string | number | Function

// See https://stackoverflow.com/a/58993872/780265
export type Immutable<T> = T extends _ImmutablePrimitive
  ? T
  : T extends Array<infer Value>
  ? ReadonlyArray<Immutable<Value>>
  : T extends Map<infer Key, infer Value>
  ? ReadonlyMap<Immutable<Key>, Immutable<Value>>
  : T extends Set<infer Value>
  ? ReadonlySet<Immutable<Value>>
  : { readonly [Key in keyof T]: Immutable<T[Key]> }

export type Flexible<T> = Immutable<T> | T

// See https://stackoverflow.com/a/74332975/780265
export type IsValidAttribute<Base, Condition> = Extract<
  keyof Base,
  {
    [Key in keyof Base]: Base[Key] extends Flexible<Condition> ? Key : never
  }[keyof Base]
> &
  string

export type NumericValue = {
  valueOf: () => number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Minified = any

/**
 * A function that produces a simplified version of a javascript object. For example, `Minifier<IntegerInterval>`
 * could be `(entry: IntegerInterval) => ({ f: entry.from.valueOf(), t: entry.to.valueOf() })`.
 */
export type Minifier<E> = (entry: E | Immutable<E>) => Minified

/**
 * A function that produces a full object from a `Minified` version. This function should throw if
 * `minifiedEntry` is malformed or contains invalid values.
 */
export type Unminifier<E> = (minifiedEntry: Minified) => E
