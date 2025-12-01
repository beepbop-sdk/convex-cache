// utils/vQuery.ts (or wherever vQueryImpl lives)
import { type GenericValidator, type PropertyValidators, v } from "convex/values";
import { validatorToJSON } from "../../validation"; // <-- your convexValidatorCodec.ts
import type { ValidatorJSON } from "convex/values";

const isConvexValidator = (value: unknown): value is { isConvexValidator: true } => {
  return typeof value === "object" && value !== null && (value as { isConvexValidator?: unknown }).isConvexValidator === true;
};

type ConvexValidatorShape = Record<string, { isConvexValidator: true }>;

/**
 * Try to turn a Convex `returns` definition into a single Convex validator:
 * - Single Convex validator -> use as-is
 * - Shape of validators    -> v.object(shape)
 */
const toConvexValidator = (returns: unknown): GenericValidator | undefined => {
  if (!returns) return undefined;

  // Single validator
  if (isConvexValidator(returns)) {
    return returns as GenericValidator;
  }

  // Shape of validators
  if (typeof returns === "object" && returns !== null && Object.values(returns).every(isConvexValidator)) {
    const shape = returns as ConvexValidatorShape;
    return v.object(shape as PropertyValidators);
  }

  return undefined;
};

/**
 * Wrap a Convex customQuery builder so that the built query function
 * carries non-enumerable `__zReturn` (Zod) and `__returnsJson` (ValidatorJSON)
 * when `def.returns` uses Convex validators.
 */
export const vQueryImpl = <TQueryFn extends (def: any) => any>(baseQuery: TQueryFn): TQueryFn => {
  return ((def: Parameters<TQueryFn>[0]) => {
    const fn = baseQuery(def);

    const maybeReturns = (def as { returns?: unknown }).returns;
    const convexValidator = toConvexValidator(maybeReturns);

    if (!convexValidator) throw new Error("Invalid returns schema");

    const returnsJson: ValidatorJSON = validatorToJSON(convexValidator);

    // Attach Convex ValidatorJSON
    Object.defineProperty(fn, "__returnsJson", {
      value: returnsJson,
      writable: false,
      configurable: false,
      enumerable: false,
    });

    return fn;
  }) as TQueryFn;
};
