import type { ZodType } from "zod";
import { convertPaginatedSchemaForClient } from "./convert-paginated-schema";
import type { PaginationResult } from "convex/server";
import type { UsePaginatedQueryResult } from "convex/react";
import type { T_SchemaMap } from "../../../types/schema-map";
import type { ValidatorJSON } from "convex/values";
import { validatorFromJSON } from "../../../../validation";
import { convexToZod } from "convex-helpers/server/zod4";

type OutputOf<Map, Key extends keyof Map> = Map[Key] extends { returns: ValidatorJSON } ? ValidatorJSON : unknown;
type PaginatedItem<Map, Key extends keyof Map> = OutputOf<Map, Key> extends PaginationResult<infer Item> ? Item : never;
type CacheableUsePaginated<T> = Pick<UsePaginatedQueryResult<T>, "results" | "status" | "isLoading">;

export function fetchSchemaFromMap<Map extends T_SchemaMap, Key extends keyof Map>(params: { queryName: Key; schemaMap: Map; type: "query" }): ZodType<OutputOf<Map, Key>>;
export function fetchSchemaFromMap<Map extends T_SchemaMap, Key extends keyof Map>(params: {
  queryName: Key;
  schemaMap: Map;
  type: "paginated";
}): ZodType<CacheableUsePaginated<PaginatedItem<Map, Key>>>;

export function fetchSchemaFromMap<Map extends T_SchemaMap, Key extends keyof Map>({ queryName, schemaMap, type }: { queryName: Key; schemaMap: Map; type: "query" | "paginated" }): ZodType<unknown> {
  const entry = schemaMap[queryName];

  if (!entry || !entry.returns) {
    throw new Error(`Schema not found for function ${String(queryName)}`);
  }

  const validator = validatorFromJSON(entry.returns);
  const zodSchema = convexToZod(validator);

  if (type === "query") {
    return zodSchema;
  }

  type Item = PaginatedItem<Map, Key>;
  type ServerOut = PaginationResult<Item>;

  const paginatedSchema = convertPaginatedSchemaForClient(zodSchema as ZodType<ServerOut>);

  return paginatedSchema;
}
