/**
 * A small JSON Schema (2020-12) validator for the playtest form of #67 (`docs/playtest/scheda.schema.json`), so the
 * harness checks a form against the schema file itself and the two cannot drift apart. Hand-written, no dependency:
 * it covers the keywords that schema uses and refuses any other, so a schema change it cannot judge fails loudly.
 */

export type Schema = { [key: string]: unknown };

const KEYWORDS = new Set([
  '$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'enum', 'const', 'pattern', 'minimum', 'maximum',
  'minLength', 'format', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'uniqueItems',
]);

export class SchemaError extends Error {}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function typeOk(type: string, v: unknown): boolean {
  switch (type) {
    case 'object': return typeof v === 'object' && v !== null && !Array.isArray(v);
    case 'array': return Array.isArray(v);
    case 'string': return typeof v === 'string';
    case 'integer': return Number.isInteger(v);
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'boolean': return typeof v === 'boolean';
    case 'null': return v === null;
    default: throw new SchemaError(`unsupported type "${type}"`);
  }
}

function resolve(root: Schema, ref: string): Schema {
  const m = /^#\/\$defs\/([\w-]+)$/.exec(ref);
  const target = m ? (root.$defs as Record<string, Schema> | undefined)?.[m[1]!] : undefined;
  if (!target) throw new SchemaError(`cannot resolve $ref "${ref}"`);
  return target;
}

/** Returns one message per problem (`$.levels[0].result: ...`); empty when the value is valid. */
export function validate(schema: Schema, value: unknown, root: Schema = schema, path = '$'): string[] {
  for (const k of Object.keys(schema)) if (!KEYWORDS.has(k)) throw new SchemaError(`unsupported keyword "${k}" at ${path}`);
  if (schema.$ref) return validate(resolve(root, schema.$ref as string), value, root, path);
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(`${path}: ${msg}`);

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
    if (!types.some((t) => typeOk(t, value))) return [`${path}: must be ${types.join(' or ')}`];
  }
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) fail(`must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !(schema.enum as unknown[]).some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    fail(`must be one of ${(schema.enum as unknown[]).map((e) => JSON.stringify(e)).join(', ')}`);
  }
  if (typeof value === 'string') {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern as string, 'u').test(value)) fail(`must match ${schema.pattern as string}`);
    if (schema.minLength !== undefined && [...value].length < (schema.minLength as number)) fail(`must have at least ${schema.minLength as number} characters`);
    if (schema.format === 'date-time' && !(DATE_TIME.test(value) && !Number.isNaN(Date.parse(value)))) fail('must be an ISO date-time');
    else if (schema.format !== undefined && schema.format !== 'date-time') throw new SchemaError(`unsupported format "${schema.format as string}"`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < (schema.minimum as number)) fail(`must be ≥ ${schema.minimum as number}`);
    if (schema.maximum !== undefined && value > (schema.maximum as number)) fail(`must be ≤ ${schema.maximum as number}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < (schema.minItems as number)) fail(`must have at least ${schema.minItems as number} items`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) fail('must not repeat items');
    if (schema.items) value.forEach((v, i) => errors.push(...validate(schema.items as Schema, v, root, `${path}[${i}]`)));
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    for (const k of (schema.required as string[] | undefined) ?? []) if (!(k in o)) fail(`missing "${k}"`);
    const props = (schema.properties as Record<string, Schema> | undefined) ?? {};
    for (const [k, v] of Object.entries(o)) {
      if (props[k]) errors.push(...validate(props[k]!, v, root, `${path}.${k}`));
      else if (schema.additionalProperties === false) fail(`unexpected "${k}"`);
      else if (typeof schema.additionalProperties === 'object') errors.push(...validate(schema.additionalProperties as Schema, v, root, `${path}.${k}`));
    }
  }
  return errors;
}

/** Validates against one definition of the schema (e.g. `levelFeedback`), as the agent sends its parts. */
export function validateDef(root: Schema, def: string, value: unknown): string[] {
  return validate({ $ref: `#/$defs/${def}` }, value, root, def);
}
