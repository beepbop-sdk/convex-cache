import { useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { useQueryKey } from "../helpers/hooks/use-query-key";
import { useClientCache } from "../helpers/hooks/use-client-cache";
import { useMemo } from "react";
import { fetchSchemaFromMap } from "../helpers/utils/fetch-schema-from-map";
import { z } from "zod";
import { Q_Query, Q_Args, Q_Result } from "../../types/types/query";
import { ZSchemaMap } from "../../../../convex";
import { useLocalDb as useLocalDbDefault } from "@bigbang-sdk/local-db";

export type T_UseCachedQueryClient<Q extends Q_Query> = {
  query: Q;
  args: Q_Args<Q>;
  schemaMap: ZSchemaMap;
  useLocalDb: typeof useLocalDbDefault<Q_Result<Q>>;
};

export const _useCachedQueryClient = <Q extends Q_Query>({ query, args, schemaMap, useLocalDb }: T_UseCachedQueryClient<Q>): Q_Result<Q> | undefined => {
  const fnKey = useMemo(() => getFunctionName(query), [query]);

  const schema = useMemo(
    () =>
      fetchSchemaFromMap({
        fnKey,
        schemaMap,
        type: "query",
      }) as z.ZodSchema<Q_Result<Q>>,
    [fnKey, schemaMap]
  );

  const raw = useQuery(query, args) as Q_Result<Q> | undefined;

  const storageKey = useQueryKey({ fnKey, args, kind: "query" });

  const cached = useClientCache<Q_Result<Q>>({
    storageKey,
    raw,
    schema,
    useLocalDb,
  });

  return (cached ?? raw) as Q_Result<Q> | undefined;
};
