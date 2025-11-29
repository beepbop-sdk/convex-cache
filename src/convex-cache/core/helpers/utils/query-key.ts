import superjson from "superjson";
import { deepSort } from "@bigbang-sdk/deep-sort";
import crypto from "crypto";

type T_MakeQueryKey = {
  fnKey: string;
  args: unknown;
  kind: "query" | "paginated";
};

export const makeQueryKey = ({ fnKey, args, kind }: T_MakeQueryKey) => {
  const ns = kind === "paginated" ? "pq" : "q";

  const sortedArgs = deepSort(args);
  const argKey = superjson.stringify(sortedArgs);

  const queryKey = `${ns}:${fnKey}:${argKey}`;

  return {
    key: queryKey,
    tag: hashKey(queryKey),
  };
};

const hashKey = (key: string) => {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
};
