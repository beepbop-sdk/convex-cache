import { _preloadPaginatedQuery, _preloadQuery } from "../server-fns/preload-query";
import { getFunctionName } from "convex/server";
import { PQ_CachedResult, PQ_Query } from "../../../core/types/types/paginated-query";
import { Q_Query, Q_Result } from "../../../core/types/types/query";
import { PQ_ArgsPreloaded, PQ_OptionsPreloaded, Q_ArgsPreloaded, Q_OptionsPreloaded } from "../types/preloaded";
import { T_SchemaMap } from "../../../types/schema-map";
import { fetchSchemaFromMap } from "../../../core/helpers/utils/fetch-schema-from-map";

export type PreloadQueryReturn<Q extends Q_Query | PQ_Query> = Q extends PQ_Query ? PQ_CachedResult<Q> | undefined : Q_Result<Q> | undefined;

export type T_PreloadQueryParams<Q extends Q_Query | PQ_Query> = {
  query: Q;
  args: Q_ArgsPreloaded<Q> | PQ_ArgsPreloaded<Q>;
  options?: Q_OptionsPreloaded<Q> | PQ_OptionsPreloaded<Q>;
  schemaMap: T_SchemaMap;
};

export async function preloadQuery<Q extends Q_Query | PQ_Query>(params: T_PreloadQueryParams<Q>): Promise<PreloadQueryReturn<Q>> {
  const { query, args, options, schemaMap } = params;
  const queryName = getFunctionName(query);

  if (args && "paginationOpts" in args) {
    // Paginated branch
    const result = (await _preloadPaginatedQuery({
      queryName,
      args: args as PQ_ArgsPreloaded<PQ_Query>,
      options,
    })) as PQ_CachedResult<PQ_Query>;

    const schema = fetchSchemaFromMap({ queryName, schemaMap, type: "paginated" });
    const validated = schema.safeParse(result);

    return (validated.success ? result : undefined) as PreloadQueryReturn<Q>;
  }

  // Non-paginated branch
  const result = (await _preloadQuery({
    queryName,
    args,
    options,
  })) as Q_Result<Q>;

  const schema = fetchSchemaFromMap({ queryName, schemaMap, type: "query" });
  const validated = schema.safeParse(result);

  return (validated.success ? result : undefined) as PreloadQueryReturn<Q>;
}
