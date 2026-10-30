/** Nominal typing for primitives: `Brand<string, 'ExpenseId'>` cannot be mixed with other strings. */
export type Brand<T, B extends string> = T & { readonly __brand: B };
