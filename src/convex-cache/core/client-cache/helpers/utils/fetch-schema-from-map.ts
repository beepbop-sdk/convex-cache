import type { ZodType } from "zod";
import type { JsonSchema } from "@bigbang-sdk/zod-json";
import { ZOD_JSON } from "@bigbang-sdk/zod-json";
import { convertPaginatedSchemaForClient } from "./convert-paginated-schema";
import type { PaginationResult } from "convex/server";
import type { UsePaginatedQueryResult } from "convex/react";
import type { ZSchemaMap } from "../../../../../convex";

type OutputOf<Map, Key extends keyof Map> = Map[Key] extends { output: JsonSchema<infer T> } ? T : unknown;
type PaginatedItem<Map, Key extends keyof Map> = OutputOf<Map, Key> extends PaginationResult<infer Item> ? Item : never;
type CacheableUsePaginated<T> = Pick<UsePaginatedQueryResult<T>, "results" | "status" | "isLoading">;

export function fetchSchemaFromMap<Map extends ZSchemaMap, Key extends keyof Map>(params: { fnKey: Key; schemaMap: Map; type: "query" }): ZodType<OutputOf<Map, Key>>;
export function fetchSchemaFromMap<Map extends ZSchemaMap, Key extends keyof Map>(params: { fnKey: Key; schemaMap: Map; type: "paginated" }): ZodType<CacheableUsePaginated<PaginatedItem<Map, Key>>>;

export function fetchSchemaFromMap<Map extends ZSchemaMap, Key extends keyof Map>({ fnKey, schemaMap, type }: { fnKey: Key; schemaMap: Map; type: "query" | "paginated" }): ZodType<unknown> {
  const entry = schemaMap[fnKey];

  if (!entry || !entry.output) {
    throw new Error(`Schema not found for function ${String(fnKey)}`);
  }

  const zodSchema = ZOD_JSON.jsonToZod<OutputOf<Map, Key>>(entry.output as unknown as Parameters<typeof ZOD_JSON.jsonToZod<OutputOf<Map, Key>>>[0]);

  if (type === "query") {
    // ZodType<OutputOf<Map, Key>>
    return zodSchema;
  }

  type Item = PaginatedItem<Map, Key>;
  type ServerOut = PaginationResult<Item>;

  const paginatedSchema = convertPaginatedSchemaForClient(zodSchema as unknown as ZodType<ServerOut>);

  return paginatedSchema;
}
