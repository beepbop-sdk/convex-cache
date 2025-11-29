import { type GenericValidator, type PropertyValidators, v } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";

const isConvexValidator = (value: unknown): value is { isConvexValidator: true } => {
  return typeof value === "object" && value !== null && (value as { isConvexValidator?: unknown }).isConvexValidator === true;
};

type ConvexValidatorShape = Record<string, { isConvexValidator: true }>;

/**
 * Try to turn a Convex `returns` definition into a Zod schema:
 * - Single Convex validator -> convexToZod(validator)
 * - Shape of validators    -> convexToZod(v.object(shape))
 */
const toZodReturnSchemaFromConvex = (returns: unknown) => {
  if (!returns) return undefined;

  // Single validator
  if (isConvexValidator(returns)) {
    return convexToZod(returns as GenericValidator);
  }

  // Shape of validators
  if (typeof returns === "object" && returns !== null && Object.values(returns).every(isConvexValidator)) {
    const shape = returns as ConvexValidatorShape;
    return convexToZod(v.object(shape as PropertyValidators));
  }

  return undefined;
};

/**
 * Wrap a Convex customQuery builder so that the built query function
 * carries a non-enumerable `__zReturn` Zod schema when `def.returns`
 * uses Convex validators.
 *
 * NOTE: we keep Convex's own `def` type intact by using
 * `TQueryFn extends (def: any) => any` and `Parameters<TQueryFn>[0]`.
 */
export const vQueryImpl = <TQueryFn extends (def: any) => any>(baseQuery: TQueryFn): TQueryFn => {
  return ((def: Parameters<TQueryFn>[0]) => {
    const fn = baseQuery(def);

    const maybeReturns = (def as { returns?: unknown }).returns;
    const zReturn = toZodReturnSchemaFromConvex(maybeReturns);

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
