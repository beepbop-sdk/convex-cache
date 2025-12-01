import { useQuery } from "convex/react";
import { Q_Query, Q_Args, Q_Result } from "../../types/types/query";
import { useEffect } from "react";
import { isDeepEqual } from "@bb-sdk/deep-equal";
import { Q_ArgsPreloaded } from "../../../adapters/next/types/preloaded";

export type T_UseCachedQueryServer<Q extends Q_Query> = {
  query: Q;
  args: Q_Args<Q>;
  preloadedData: Q_Result<Q> | undefined;
  revalidateCache: ({ query, args }: { query: Q; args: Q_ArgsPreloaded<Q> }) => void;
};

export const _useCachedQueryServer = <Q extends Q_Query>({ query, args, preloadedData, revalidateCache }: T_UseCachedQueryServer<Q>): Q_Result<Q> | undefined => {
  const raw = useQuery(query, args) as Q_Result<Q> | undefined;

  useEffect(() => {
    if (args === "skip") return;
    if (!raw) return;
    if (isDeepEqual(preloadedData, raw)) return;

    revalidateCache({ query, args });
  }, [raw]);

  return raw ?? preloadedData;
};
