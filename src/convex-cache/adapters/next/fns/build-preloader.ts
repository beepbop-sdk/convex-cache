import { Q_Query } from "../../../core/types/types/query";
import { PQ_Query } from "../../../core/types/types/paginated-query";
import { preloadQuery, PreloadQueryReturn, T_PreloadQueryParams } from "./preload-query";
import { T_SchemaMap } from "../../../types/schema-map";

export function buildPreloader(schemaMap: T_SchemaMap) {
  return function preloadQueryBound<Q extends Q_Query | PQ_Query>(params: Omit<T_PreloadQueryParams<Q>, "schemaMap">): Promise<PreloadQueryReturn<Q>> {
    return preloadQuery({ ...params, schemaMap });
  };
}
