// convexValidatorCodec.ts
import { jsonToConvex, v, type GenericValidator } from "convex/values";
import type { ValidatorJSON, RecordKeyValidatorJSON, RecordValueValidatorJSON, ObjectFieldType } from "convex/values";

/**
 * Serialize a Convex validator to its canonical JSON representation.
 */
export function validatorToJSON(validator: GenericValidator): ValidatorJSON {
  return (validator as unknown as { json: ValidatorJSON }).json;
}

/**
 * Rebuild a Convex validator from its ValidatorJSON representation.
 */
export function validatorFromJSON(json: ValidatorJSON): GenericValidator {
  switch (json.type) {
    case "null":
      return v.null();

    case "number":
      return v.number();

    case "bigint":
      return v.int64(); // or v.bigint(), depending on your style

    case "boolean":
      return v.boolean();

    case "string":
      return v.string();

    case "bytes":
      return v.bytes();

    case "any":
      return v.any();

    case "literal":
      // json.value is a JSONValue; Convex used convexToJson to serialize it.
      // If you have jsonToConvex, use it here; otherwise assume value is already fine.
      return v.literal(jsonToConvex(json.value) as string | number | bigint | boolean);

    case "id":
      return v.id(json.tableName);

    case "array": {
      const elementValidator = validatorFromJSON(json.value);
      return v.array(elementValidator);
    }

    case "union": {
      const members = json.value.map((j) => validatorFromJSON(j)) as GenericValidator[];
      // v.union expects required validators
      return v.union(...members);
    }

    case "object": {
      const fields: Record<string, GenericValidator> = {};
      for (const [name, field] of Object.entries(json.value as Record<string, ObjectFieldType>)) {
        const base = validatorFromJSON(field.fieldType);
        const maybeOptional = field.optional ? v.optional(base) : base;
        fields[name] = maybeOptional;
      }
      return v.object(fields);
    }

    case "record": {
      const keyValidator = recordKeyFromJSON(json.keys);
      const valueValidator = recordValueFromJSON(json.values);
      return v.record(keyValidator, valueValidator);
    }

    default: {
      const _exhaustive: never = json;
      throw new Error(`Unknown validator JSON type: ${(_exhaustive as unknown as { type: string }).type}`);
    }
  }
}

function recordKeyFromJSON(json: RecordKeyValidatorJSON): GenericValidator {
  switch (json.type) {
    case "string":
      return v.string();
    case "id":
      return v.id(json.tableName);
    case "union": {
      const members = json.value.map((j) => recordKeyFromJSON(j)) as GenericValidator[];
      return v.union(...members);
    }
    default: {
      const _exhaustive: never = json;
      throw new Error(`Unknown record key validator JSON type: ${(_exhaustive as unknown as { type: string }).type}`);
    }
  }
}

function recordValueFromJSON(json: RecordValueValidatorJSON): GenericValidator {
  // json.optional is always false by type, but we’ll respect it anyway.
  const base = validatorFromJSON(json.fieldType);
  return json.optional ? v.optional(base) : base;
}
