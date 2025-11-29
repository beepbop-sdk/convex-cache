import { makeFunctionReference } from "convex/server";
import { fetchQuery } from "convex/nextjs";
import { cacheLife, cacheTag } from "next/cache";
import { Q_Query, Q_Result } from "../../../core/types/types/query";
import { PQ_CachedResult, PQ_Query } from "../../../core/types/types/paginated-query";
import { makeQueryKey } from "../../../core/helpers/utils/query-key";
import type { PQ_ArgsPreloaded, PQ_OptionsPreloaded, Q_ArgsPreloaded, Q_OptionsPreloaded } from "../types/preloaded";
import { defaultCacheProfile } from "../utils/cache-profile";

type T_PreloadQueryParams<Q extends Q_Query> = {
  queryName: string;
  args: Q_ArgsPreloaded<Q>;
  options?: Q_OptionsPreloaded<Q>;
};

export const _preloadQuery = async ({ queryName, args, options }: T_PreloadQueryParams<Q_Query>): Promise<Q_Result<Q_Query>> => {
  "use cache";

  const { tag } = makeQueryKey({ fnKey: queryName, args, kind: "query" });
  cacheTag(tag);
  cacheLife(defaultCacheProfile);

  const fnRef = makeFunctionReference(queryName) as Q_Query;

  const argsTuple = [args, options] as [Q_ArgsPreloaded<Q_Query>, Q_OptionsPreloaded<Q_Query>];
  const result = await fetchQuery(fnRef, ...argsTuple);

  return result;
};

type T_PreloadPaginatedQueryParams<Q extends PQ_Query> = {
  queryName: string;
  args: PQ_ArgsPreloaded<Q>;
  options?: PQ_OptionsPreloaded<Q>;
};

export const _preloadPaginatedQuery = async ({ queryName, args, options }: T_PreloadPaginatedQueryParams<PQ_Query>): Promise<PQ_CachedResult<PQ_Query>> => {
  "use cache";

  const { tag } = makeQueryKey({ fnKey: queryName, args, kind: "paginated" });
  cacheTag(tag);
  cacheLife(defaultCacheProfile);

  const fnRef = makeFunctionReference(queryName) as PQ_Query;

  const argsTuple = [args, options] as [PQ_ArgsPreloaded<PQ_Query>, PQ_OptionsPreloaded<PQ_Query>];
  const result = await fetchQuery(fnRef, ...argsTuple);

  return convertPaginatedResultForClient({ result });
};

const convertPaginatedResultForClient = <Q extends PQ_Query>({ result }: { result: Q_Result<Q> }): PQ_CachedResult<Q> => {
  return {
    results: result.page,
    status: "Exhausted",
    isLoading: false,
  };
};
