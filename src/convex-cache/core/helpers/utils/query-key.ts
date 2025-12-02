import superjson from "superjson";
import { deepSort } from "@bb-labs/deep-sort";
import crypto from "crypto";

type T_MakeQueryKey = {
  queryName: string;
  args: unknown;
  kind: "query" | "paginated";
};

export const makeQueryKey = ({ queryName, args, kind }: T_MakeQueryKey) => {
  const ns = kind === "paginated" ? "pq" : "q";

  const sortedArgs = deepSort(args);
  const argKey = superjson.stringify(sortedArgs);

  const queryKey = `${ns}:${queryName}:${argKey}`;

  return {
    key: queryKey,
    tag: hashKey(queryKey),
  };
};

const hashKey = (key: string) => {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
};
