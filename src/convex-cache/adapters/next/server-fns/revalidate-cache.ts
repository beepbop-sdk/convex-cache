"use server";
import { revalidateTag } from "next/cache";
import { defaultCacheProfile } from "../utils/cache-profile";

export const revalidateCache = async ({ tag }: { tag: string }) => {
  revalidateTag(tag, defaultCacheProfile);
};
