import { T_UseCachedPaginatedQueryClient, _useCachedPaginatedQueryClient } from "../../../core/client-cache/queries/paginated-query";
import { Q_Query, PQ_Query, PQ_CachedResult, PQ_Item } from "../../../core/types";
import { T_UseCachedQueryClient, _useCachedQueryClient } from "../../../core/client-cache/queries/query";
import { useConvexProvider } from "../provider/provider";
import { useLocalDb as useLocalDbDefault } from "@bb-labs/local-db";

type T_UseQuery<Q extends Q_Query> = Omit<T_UseCachedQueryClient<Q>, "schemaMap" | "useLocalDb">;
type T_UsePaginatedQuery<Q extends PQ_Query> = Omit<T_UseCachedPaginatedQueryClient<Q>, "schemaMap" | "useLocalDb">;

export const useCachedQueryClient = <Q extends Q_Query>({ query, args }: T_UseQuery<Q>) => {
  const { schemaMap, useLocalDb } = useConvexProvider();

  return _useCachedQueryClient({ query, args, schemaMap, useLocalDb: useLocalDb ?? useLocalDbDefault });
};

export const useCachedPaginatedQueryClient = <Q extends PQ_Query>({ query, args, options }: T_UsePaginatedQuery<Q>) => {
  const { schemaMap, useLocalDb } = useConvexProvider();

  return _useCachedPaginatedQueryClient({ query, args, options, schemaMap, useLocalDb: (useLocalDb ?? useLocalDbDefault) as typeof useLocalDbDefault<PQ_CachedResult<Q>> });
};
