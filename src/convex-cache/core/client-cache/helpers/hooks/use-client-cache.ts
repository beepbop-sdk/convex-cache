import { useLocalDb as useLocalDbDefault } from "@bb-sdk/local-db";
import { useEffect } from "react";
import deepEqual from "fast-deep-equal";
import { z } from "zod";

type T_UseClientCache<T> = {
  storageKey: string;
  raw: T | undefined;
  schema: z.ZodSchema<T>;
  useLocalDb: typeof useLocalDbDefault<T>;
};

export const useClientCache = <T>({ storageKey, raw, schema, useLocalDb }: T_UseClientCache<T>): T | null | undefined => {
  const { value: stored, setValue: setStored } = useLocalDb({
    key: storageKey,
    schema,
    initialValue: undefined,
    dbName: "convex-cache",
    storeName: "local-store",
  });

  useEffect(() => {
    if (raw !== undefined && !deepEqual(raw, stored)) setStored(raw);
  }, [raw, stored, setStored]);

  return stored as T | null | undefined;
};
