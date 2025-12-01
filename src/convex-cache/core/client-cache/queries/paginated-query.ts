import { usePaginatedQuery } from "convex/react";
import { useQueryKey } from "../helpers/hooks/use-query-key";
import { useClientCache } from "../helpers/hooks/use-client-cache";
import { getFunctionName } from "convex/server";
import { useMemo } from "react";
import { PQ_Query, PQ_Args, PQ_Result, PQ_CachedResult } from "../../types/types/paginated-query";
import type { T_SchemaMap } from "../../../types/schema-map";
import { fetchSchemaFromMap } from "../../helpers/utils/fetch-schema-from-map";
import { useLocalDb as useLocalDbDefault } from "@bb-sdk/local-db";

export type T_UseCachedPaginatedQueryClient<Q extends PQ_Query> = {
  query: Q;
  args: PQ_Args<Q>;
  options: { initialNumItems: number };
  schemaMap: T_SchemaMap;
  useLocalDb: typeof useLocalDbDefault<PQ_CachedResult<Q>>;
};

export const _useCachedPaginatedQueryClient = <Q extends PQ_Query>({ query, args, options, schemaMap, useLocalDb }: T_UseCachedPaginatedQueryClient<Q>): PQ_Result<Q> => {
  const queryName = useMemo(() => getFunctionName(query), [query]);

  const schema = useMemo(
    () =>
      fetchSchemaFromMap({
        queryName,
        schemaMap,
        type: "paginated",
      }),
    [queryName, schemaMap]
  );

  const raw = usePaginatedQuery(query, args, options);
  const storageKey = useQueryKey({ queryName, args, kind: "paginated" });

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
