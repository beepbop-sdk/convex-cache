import { z, type ZodType, ZodArray, ZodObject } from "zod";
import type { PaginationResult } from "convex/server";
import type { UsePaginatedQueryResult } from "convex/react";

type T_ServerSchema<T> = PaginationResult<T>;

type CacheableUsePaginated<T> = Pick<UsePaginatedQueryResult<T>, "results" | "status" | "isLoading">;

/**
 * Convert a Zod schema for `PaginationResult<T>` (server) into a Zod schema
 * for the cacheable subset of `UsePaginatedQueryResult<T>` (client).
 *
 * `Item` is inferred as: z.output<ServerSchema>["page"][number]
 */
export const convertPaginatedSchemaForClient = <ServerSchema extends ZodType<T_ServerSchema<unknown>>, Item = z.output<ServerSchema>["page"][number]>(
  schema: ServerSchema
): ZodType<CacheableUsePaginated<Item>> => {
  let itemSchema: ZodType<Item>;

  // Try to extract the item schema from the server schema's `page` field.
  if (schema instanceof ZodObject) {
    const objShape = (schema as unknown as { shape: Record<string, ZodType<unknown>> }).shape;

    if (objShape && objShape.page instanceof ZodArray) {
      itemSchema = objShape.page.element as ZodType<Item>;
    } else {
      console.warn("[convertPaginatedSchemaForClient] Server schema object has no `page` array; falling back to z.any() for items.", schema);
      itemSchema = z.any() as ZodType<Item>;
    }
  } else {
    console.warn("[convertPaginatedSchemaForClient] Server schema is not a ZodObject; falling back to z.any() for items.", schema);
    itemSchema = z.any() as ZodType<Item>;
  }

  // Base part shared by all cacheable paginated variants (no loadMore)
  const base = z.object({
    results: z.array(itemSchema),
  });

  const loadingFirstPage = base.extend({
    status: z.literal("LoadingFirstPage"),
    isLoading: z.literal(true),
  });

  const canLoadMore = base.extend({
    status: z.literal("CanLoadMore"),
    isLoading: z.literal(false),
  });

  const loadingMore = base.extend({
    status: z.literal("LoadingMore"),
    isLoading: z.literal(true),
  });

  const exhausted = base.extend({
    status: z.literal("Exhausted"),
    isLoading: z.literal(false),
  });

  const clientSchema = z.union([loadingFirstPage, canLoadMore, loadingMore, exhausted]);

  return clientSchema as ZodType<CacheableUsePaginated<Item>>;
};
