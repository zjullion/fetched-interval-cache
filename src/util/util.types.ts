/** @ignore */
// eslint-disable-next-line @typescript-eslint/ban-types
type _ImmutablePrimitive = undefined | null | boolean | string | number | Function

// See https://stackoverflow.com/a/58993872/780265
/** An object that is recursively immutable. This type statically guards against modifying objects
 * that should never be modified. Obviously, objects can always be changed at runtime.
 */
export type Immutable<T> = T extends _ImmutablePrimitive
  ? T
  : T extends Array<infer Value>
  ? ReadonlyArray<Immutable<Value>>
  : T extends Map<infer Key, infer Value>
  ? ReadonlyMap<Immutable<Key>, Immutable<Value>>
  : T extends Set<infer Value>
  ? ReadonlySet<Immutable<Value>>
  : { readonly [Key in keyof T]: Immutable<T[Key]> }

/** @ignore */
export type Flexible<T> = Immutable<T> | T

// See https://stackoverflow.com/a/74332975/780265
/** @ignore */
export type IsValidAttribute<Base, Condition> = Extract<
  keyof Base,
  {
    [Key in keyof Base]: Base[Key] extends Flexible<Condition> ? Key : never
  }[keyof Base]
> &
  string

/**
 * Any object that provides a `valueOf()` function which returns a `number`. The built-in types
 * `string` and `number` (among others) satisfy this constraint.
 */
export type NumericValue = {
  valueOf: () => number
}

/** @ignore */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Minified = any

/**
 * A function that produces a simplified version of a javascript object. For example, `Minifier<IntegerInterval>`
 * could be `(entry: IntegerInterval) => ({ f: entry.from.valueOf(), t: entry.to.valueOf() })`.
 */
export type Minifier<EntryType> = (entry: EntryType | Immutable<EntryType>) => Minified

/**
 * A function that produces a full object from a `Minified` version. This function should throw if
 * `minifiedEntry` is malformed or contains invalid values.
 */
export type Unminifier<EntryType> = (minifiedEntry: Minified) => EntryType
