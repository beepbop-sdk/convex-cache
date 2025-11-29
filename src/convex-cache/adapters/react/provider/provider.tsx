import { createContext, useContext } from "react";
import { ZSchemaMap } from "../../../../convex";
import { useLocalDb as useLocalDbDefault } from "@bigbang-sdk/local-db";

type T_ConvexCacheContext = {
  schemaMap: ZSchemaMap | undefined;
  useLocalDb: typeof useLocalDbDefault<unknown> | undefined;
};

const convexCacheContext = createContext<T_ConvexCacheContext>({
  schemaMap: undefined,
  useLocalDb: undefined,
});

type T_ConvexCacheProvider = {
  children: React.ReactNode;
  schemaMap: ZSchemaMap;
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
