import { usePaginatedQuery } from "convex/react";
import { useQueryKey } from "../helpers/hooks/use-query-key";
import { useClientCache } from "../helpers/hooks/use-client-cache";
import { getFunctionName } from "convex/server";
import { useMemo } from "react";
import { fetchSchemaFromMap } from "../helpers/utils/fetch-schema-from-map";
import { PQ_Query, PQ_Args, PQ_Result, PQ_Item, PQ_CachedResult } from "../../types/types/paginated-query";
import { ZSchemaMap } from "../../../../convex";
import { useLocalDb as useLocalDbDefault } from "@bigbang-sdk/local-db";

export type T_UseCachedPaginatedQueryClient<Q extends PQ_Query> = {
  query: Q;
  args: PQ_Args<Q>;
  options: { initialNumItems: number };
  schemaMap: ZSchemaMap;
  useLocalDb: typeof useLocalDbDefault<PQ_CachedResult<Q>>;
};

export const _useCachedPaginatedQueryClient = <Q extends PQ_Query>({ query, args, options, schemaMap, useLocalDb }: T_UseCachedPaginatedQueryClient<Q>): PQ_Result<Q> => {
  const fnKey = useMemo(() => getFunctionName(query), [query]);

  const schema = useMemo(
    () =>
      fetchSchemaFromMap({
        fnKey,
        schemaMap,
        type: "paginated",
      }),
    [fnKey, schemaMap]
  );

  const raw = usePaginatedQuery(query, args, options);
  const storageKey = useQueryKey({ fnKey, args, kind: "paginated" });

  const cacheInput =
    raw.status === "LoadingFirstPage"
      ? undefined
      : ({
          results: raw.results,
          status: raw.status,
          isLoading: raw.isLoading,
        } satisfies PQ_CachedResult<Q>);

  const cached = useClientCache<PQ_CachedResult<Q>>({
    storageKey,
    raw: cacheInput,
    schema,
    useLocalDb,
  });

  if (!cached) return raw;

  return {
    ...raw,
    results: cached.results,
    status: cached.status,
    isLoading: cached.isLoading,
  } as PQ_Result<Q>;
};
