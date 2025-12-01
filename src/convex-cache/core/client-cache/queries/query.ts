import { useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { useQueryKey } from "../helpers/hooks/use-query-key";
import { useClientCache } from "../helpers/hooks/use-client-cache";
import { useMemo } from "react";
import { Q_Query, Q_Args, Q_Result } from "../../types/types/query";
import type { T_SchemaMap } from "../../../types/schema-map";
import { useLocalDb as useLocalDbDefault } from "@bb-sdk/local-db";
import { fetchSchemaFromMap } from "../../helpers/utils/fetch-schema-from-map";

export type T_UseCachedQueryClient<Q extends Q_Query> = {
  query: Q;
  args: Q_Args<Q>;
  schemaMap: T_SchemaMap;
  useLocalDb: typeof useLocalDbDefault<Q_Result<Q>>;
};

export const _useCachedQueryClient = <Q extends Q_Query>({ query, args, schemaMap, useLocalDb }: T_UseCachedQueryClient<Q>): Q_Result<Q> | undefined => {
  const queryName = useMemo(() => getFunctionName(query), [query]);

  const schema = useMemo(
    () =>
      fetchSchemaFromMap({
        queryName,
        schemaMap,
        type: "query",
      }),
    [queryName, schemaMap]
  );

  const raw = useQuery(query, args) as Q_Result<Q> | undefined;

  const storageKey = useQueryKey({ queryName, args, kind: "query" });

  const cached = useClientCache<Q_Result<Q>>({
    storageKey,
    raw,
    schema,
    useLocalDb,
  });

  return (cached ?? raw) as Q_Result<Q> | undefined;
};
