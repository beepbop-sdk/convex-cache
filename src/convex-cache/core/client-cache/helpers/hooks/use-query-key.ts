import { useMemo } from "react";
import { makeQueryKey } from "../../../helpers/utils/query-key";

type T_UseQueryKey = {
  fnKey: string;
  args: unknown;
  kind: "query" | "paginated";
};

export const useQueryKey = ({ fnKey, args, kind }: T_UseQueryKey): string => {
  return useMemo(() => makeQueryKey({ fnKey, args, kind }).key, [fnKey, args, kind]);
};
