import type { JsonSchema } from "@bigbang-sdk/zod-json";

// export type ZSchemaMap = {
//   [key: string]: {
//     output: JsonSchema;
//   };
// };

export type ZSchemaMap = Record<string, { output: JsonSchema<unknown> }>;
