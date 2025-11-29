import { Q_Query } from "../../../core/types/types/query";
import { makeQueryKey } from "../../../core/helpers/utils/query-key";
import { getFunctionName } from "convex/server";
import { revalidateCache } from "../server-fns/revalidate-cache";
import { PQ_Query } from "../../../core/types/types/paginated-query";
import { PQ_ArgsPreloaded, Q_ArgsPreloaded } from "../types/preloaded";

export const revalidateQueryCache = async <Q extends Q_Query>({ query, args }: { query: Q; args: Q_ArgsPreloaded<Q> }) => {
  const fnKey = getFunctionName(query);

  const { tag } = makeQueryKey({
    fnKey,
    args,
    kind: "query",
  });

  await revalidateCache({ tag });
};

type T_RevalidatePaginatedQueryCacheParams<Q extends PQ_Query> = {
  query: Q;
  args: PQ_ArgsPreloaded<Q>;
};

export const revalidatePaginatedQueryCache = async <Q extends PQ_Query>({ query, args }: T_RevalidatePaginatedQueryCacheParams<Q>) => {
  const fnKey = getFunctionName(query);

  const { tag } = makeQueryKey({
    fnKey,
    args,
    kind: "paginated",
  });

  await revalidateCache({ tag });
};
