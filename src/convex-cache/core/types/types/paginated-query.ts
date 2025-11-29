import { ConvexHttpClient } from "convex/browser";
import { PaginatedQueryReference, PaginatedQueryArgs, UsePaginatedQueryResult, PaginatedQueryItem } from "convex/react";

export type PQ_Query = PaginatedQueryReference;

export type PQ_Args<Q extends PQ_Query> = PaginatedQueryArgs<Q> | "skip";

export type PQ_Result<Q extends PQ_Query> = UsePaginatedQueryResult<PaginatedQueryItem<Q>>;

export type PQ_Item<Q extends PQ_Query> = PaginatedQueryItem<Q>;
export type PQ_CachedResult<Q extends PQ_Query> = Pick<UsePaginatedQueryResult<PQ_Item<Q>>, "results" | "status" | "isLoading">;

export const client = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"] ?? "");
