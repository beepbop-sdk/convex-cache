import { Q_Query, PQ_Query } from "../../../core/types";
import { _useCachedPaginatedQueryServer, T_UseCachedPaginatedQueryServer } from "../../../core/server-cache/queries/paginated-query";
import { _useCachedQueryServer, T_UseCachedQueryServer } from "../../../core/server-cache/queries/query";
import { revalidatePaginatedQueryCache, revalidateQueryCache } from "../lib/revalidate-query-cache";

type T_UseCachedQueryServerParams<Q extends Q_Query> = Omit<T_UseCachedQueryServer<Q>, "revalidateCache">;
export const useCachedQueryServer = <Q extends Q_Query>({ query, args, preloadedData }: T_UseCachedQueryServerParams<Q>) => {
  return _useCachedQueryServer({ query, args, preloadedData, revalidateCache: revalidateQueryCache });
};

type T_UseCachedPaginatedQueryServerParams<Q extends PQ_Query> = Omit<T_UseCachedPaginatedQueryServer<Q>, "revalidateCache">;
export const useCachedPaginatedQueryServer = <Q extends PQ_Query>({ query, args, options, preloadedData }: T_UseCachedPaginatedQueryServerParams<Q>) => {
  return _useCachedPaginatedQueryServer({ query, args, options, preloadedData, revalidateCache: revalidatePaginatedQueryCache });
};
