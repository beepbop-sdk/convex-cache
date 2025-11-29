import { OptionalRestArgsOrSkip } from "convex/react";
import { FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";

export type Q_Query = FunctionReference<"query">;

export type Q_Args<Q extends Q_Query> = OptionalRestArgsOrSkip<Q>[0];

export type Q_Result<Q extends Q_Query> = FunctionReturnType<Q>;
