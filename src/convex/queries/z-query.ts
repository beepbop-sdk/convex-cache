import { z, ZodType } from "zod";

type ZodShape = Record<string, ZodType>;

const isZodType = (value: unknown): value is ZodType => {
  return value instanceof ZodType;
};

const isZodShape = (value: unknown): value is ZodShape => {
  return !!value && typeof value === "object" && Object.values(value).every(isZodType);
};

/**
 * Normalize `returns` into a concrete Zod schema if possible.
 */
const toZodReturnSchema = (returns: unknown): ZodType | undefined => {
  if (!returns) return undefined;

  if (isZodType(returns)) {
    // returns: z.string(), z.object(...), etc.
    return returns;
  }

  if (isZodShape(returns)) {
    // returns: { foo: z.string(), bar: z.number() }
    return z.object(returns);
  }

  return undefined;
};

/**
 * Wrap a Convex-zod query builder so that the built query function
 * carries a non-enumerable `__zReturn` Zod schema when `def.returns` is provided.
 *
 * NOTE: We *do not* change the type of `def` – we preserve Convex's type
 * by using `TQueryFn extends (def: any) => any` and `Parameters<TQueryFn>[0]`.
 */
export const zQueryImpl = <TQueryFn extends (def: any) => any>(baseQuery: TQueryFn): TQueryFn => {
  return ((def: Parameters<TQueryFn>[0]) => {
    const fn = baseQuery(def);

    // Read returns in a type-safe-ish way without changing `def`'s declared type
    const maybeReturns = (def as { returns?: unknown }).returns;
    const zReturn = toZodReturnSchema(maybeReturns);

    if (zReturn) {
      Object.defineProperty(fn, "__zReturn", {
        value: zReturn,
        writable: false,
        configurable: false,
        enumerable: false,
      });
    }

    return fn;
  }) as TQueryFn;
};
