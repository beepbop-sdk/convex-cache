import { loadConvex } from "./fns/load-convex";
import { buildSchemaMap } from "./fns/build-schema-map";
import { ValidatorJSON } from "convex/values";

export type SchemaEntry = {
  fnName: string;
  schemaJson: {
    returns: ValidatorJSON;
  };
};

const generateZSchema = async (): Promise<void> => {
  const loaded = await loadConvex();
  if (!loaded) return;
  const { api, files, convexDir } = loaded;

  await buildSchemaMap({ files, api, convexDir });
};

const main = async (): Promise<void> => {
  await generateZSchema();
};

main().catch((err) => {
  console.error("⚠️  Bun generate-z-schema failed:", err);
  process.exit(1);
});
