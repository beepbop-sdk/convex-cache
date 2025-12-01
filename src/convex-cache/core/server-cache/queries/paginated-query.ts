import { usePaginatedQuery } from "convex/react";
import { PQ_Query, PQ_Args, PQ_Result, PQ_CachedResult, PQ_Item } from "../../types/types/paginated-query";
import { useEffect } from "react";
import { isDeepEqual } from "@bigbang-sdk/deep-equal";
import { PQ_ArgsPreloaded } from "../../../adapters/next/types/preloaded";

export type T_UseCachedPaginatedQueryServer<Q extends PQ_Query> = {
  query: Q;
  args: PQ_Args<Q>;
  options: { initialNumItems: number };
  preloadedData: PQ_CachedResult<Q> | undefined;
  revalidateCache: ({ query, args }: { query: Q; args: PQ_ArgsPreloaded<Q> }) => void;
};

export const _useCachedPaginatedQueryServer = <Q extends PQ_Query>({ query, args, options, preloadedData, revalidateCache }: T_UseCachedPaginatedQueryServer<Q>): PQ_Result<Q> => {
  const raw = usePaginatedQuery(query, args, options);

  useEffect(() => {
    if (args === "skip") return;
    if (raw.isLoading) return;
    if (isDeepEqual(preloadedData, raw)) return;

    revalidateCache({ query, args: { ...args, paginationOpts: { numItems: options.initialNumItems, cursor: null } } as PQ_ArgsPreloaded<Q> });
  }, [raw]);

  return raw.status == "LoadingFirstPage" ? ({ ...(preloadedData ?? { results: [], status: "LoadingFirstPage", isLoading: false }), loadMore: () => {} } as PQ_Result<Q>) : raw;
};
