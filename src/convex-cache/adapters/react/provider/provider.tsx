import { createContext, useContext } from "react";
import type { T_SchemaMap } from "../../../types/schema-map";
import { useLocalDb as useLocalDbDefault } from "@bb-labs/local-db";

type T_ConvexCacheContext = {
  schemaMap: T_SchemaMap | undefined;
  useLocalDb: typeof useLocalDbDefault<unknown> | undefined;
};

const convexCacheContext = createContext<T_ConvexCacheContext>({
  schemaMap: undefined,
  useLocalDb: undefined,
});

type T_ConvexCacheProvider = {
  children: React.ReactNode;
  schemaMap: T_SchemaMap;
  useLocalDb?: typeof useLocalDbDefault<unknown>;
};

export const ConvexCacheProvider = ({ children, schemaMap, useLocalDb }: T_ConvexCacheProvider) => {
  return <convexCacheContext.Provider value={{ schemaMap, useLocalDb }}>{children}</convexCacheContext.Provider>;
};

export const useConvexProvider = () => {
  const context = useContext(convexCacheContext);

  if (!context || !context.schemaMap) {
    throw new Error("Application must be wrapped in a <ConvexCacheProvider />");
  }

  return { schemaMap: context.schemaMap, useLocalDb: context.useLocalDb };
};
