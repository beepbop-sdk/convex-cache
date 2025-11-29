import { _preloadPaginatedQuery, _preloadQuery } from "../server-fns/preload-query";
import { getFunctionName } from "convex/server";
import { PQ_CachedResult, PQ_Query } from "../../../core/types/types/paginated-query";
import { Q_Query, Q_Result } from "../../../core/types/types/query";
import { PQ_ArgsPreloaded, PQ_OptionsPreloaded, Q_ArgsPreloaded, Q_OptionsPreloaded } from "../types/preloaded";

type T_PreloadQueryParams<Q extends Q_Query | PQ_Query> = {
  query: Q;
  args: Q_ArgsPreloaded<Q> | PQ_ArgsPreloaded<Q>;
  options?: Q_OptionsPreloaded<Q> | PQ_OptionsPreloaded<Q>;
};

// export async function preloadQuery<Q extends Q_Query>({ query, args, options }: { query: Q; args: Q_ArgsPreloaded<Q>; options?: Q_OptionsPreloaded<Q> }): Promise<Q_Result<Q>>;
// export async function preloadQuery<Q extends PQ_Query>({ query, args, options }: { query: Q; args: PQ_ArgsPreloaded<Q>; options?: PQ_OptionsPreloaded<Q> }): Promise<PQ_CachedResult<Q>>;

export async function preloadQuery<Q extends Q_Query | PQ_Query>(params: T_PreloadQueryParams<Q>): Promise<Q extends PQ_Query ? PQ_CachedResult<Q> : Q_Result<Q>> {
  const { query, args, options } = params;
  const queryName = getFunctionName(query);

  if (args && "paginationOpts" in args) {
    return _preloadPaginatedQuery({ queryName, args: args as PQ_ArgsPreloaded<PQ_Query>, options }) as any;
  }

  return _preloadQuery({ queryName, args, options }) as any;
}
