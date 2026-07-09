// OpenAPI 3.x / Swagger 2.0 导入器
// 完整解析 spec：创建集合（info.title）、按 tag 分组、生成完整 HttpRequestItem

import type { HttpHeader, HttpRequestItem } from '../types';
import { createEmptyRequest } from '../types';

interface OpenApiPath {
  [method: string]: OpenApiOperation | undefined;
}

interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  security?: OpenApiSecurityRequirement[];
  deprecated?: boolean;
}

interface OpenApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'formData' | 'body';
  description?: string;
  required?: boolean;
  schema?: OpenApiSchema;
  type?: string;
  example?: unknown;
  default?: unknown;
  $ref?: string;
}

interface OpenApiRequestBody {
  description?: string;
  content?: { [media: string]: { schema?: OpenApiSchema; example?: unknown } };
  required?: boolean;
}

interface OpenApiSchema {
  type?: string;
  format?: string;
  properties?: { [key: string]: OpenApiSchema };
  required?: string[];
  items?: OpenApiSchema;
  $ref?: string;
  description?: string;
  example?: unknown;
  default?: unknown;
  enum?: unknown[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
}

interface OpenApiSecurityRequirement {
  [schemeName: string]: string[];
}

interface OpenApiSecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: { authorizationUrl: string; scopes: { [k: string]: string } };
    password?: { tokenUrl: string; scopes: { [k: string]: string } };
  };
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

function resolveRef(ref: string, spec: Record<string, unknown>): OpenApiSchema | undefined {
  // #/components/schemas/Foo -> components.schemas.Foo
  if (!ref.startsWith('#/')) return undefined;
  const parts = ref.substring(2).split('/');
  let cur: unknown = spec;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur as OpenApiSchema | undefined;
}

function exampleFromSchema(schema: OpenApiSchema | undefined, spec: Record<string, unknown>, depth = 0): unknown {
  if (!schema || depth > 5) return undefined;
  if (schema.$ref) {
    return exampleFromSchema(resolveRef(schema.$ref, spec), spec, depth + 1);
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  switch (schema.type) {
    case 'string':
      return schema.format === 'date-time' ? '2024-01-01T00:00:00Z' : 'string';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array': {
      const item = exampleFromSchema(schema.items, spec, depth + 1);
      return item === undefined ? [] : [item];
    }
    case 'object': {
      const obj: Record<string, unknown> = {};
      const props = schema.properties || {};
      for (const [k, v] of Object.entries(props)) {
        const ex = exampleFromSchema(v, spec, depth + 1);
        if (ex !== undefined) obj[k] = ex;
      }
      return obj;
    }
    case undefined: {
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(schema.properties)) {
          const ex = exampleFromSchema(v, spec, depth + 1);
          if (ex !== undefined) obj[k] = ex;
        }
        return obj;
      }
      if (schema.oneOf?.length) return exampleFromSchema(schema.oneOf[0], spec, depth + 1);
      if (schema.anyOf?.length) return exampleFromSchema(schema.anyOf[0], spec, depth + 1);
      if (schema.allOf?.length) {
        const merged: Record<string, unknown> = {};
        for (const s of schema.allOf) {
          const ex = exampleFromSchema(s, spec, depth + 1);
          if (ex && typeof ex === 'object') Object.assign(merged, ex);
        }
        return merged;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function getBaseUrl(spec: Record<string, unknown>): string {
  if (Array.isArray(spec.servers) && spec.servers.length > 0) {
    const s = spec.servers[0] as { url?: string };
    return s?.url || '';
  }
  // Swagger 2.0
  if (spec.host) {
    const scheme = (spec.schemes as string[] | undefined)?.[0] || 'https';
    const basePath = (spec.basePath as string | undefined) || '';
    return `${scheme}://${spec.host}${basePath}`;
  }
  return '';
}

function collectParameters(op: OpenApiOperation, pathItemParams: OpenApiParameter[] | undefined, spec: Record<string, unknown>): OpenApiParameter[] {
  const all = [...(pathItemParams || []), ...(op.parameters || [])];
  return all.map((p) => (p.$ref ? (resolveRef(p.$ref, spec) as OpenApiParameter) : p)).filter(Boolean) as OpenApiParameter[];
}

function buildAuthFromSecurity(
  security: OpenApiSecurityRequirement[] | undefined,
  schemes: Record<string, OpenApiSecurityScheme> | undefined,
): { authType: string; authUsername?: string; authPassword?: string; authToken?: string; authApiKeyName?: string; authApiKeyValue?: string } {
  if (!security || security.length === 0 || !schemes) return { authType: 'none' };
  const first = security[0];
  const schemeName = Object.keys(first)[0];
  if (!schemeName) return { authType: 'none' };
  const scheme = schemes[schemeName];
  if (!scheme) return { authType: 'none' };
  switch (scheme.type) {
    case 'http':
      if ((scheme.scheme || '').toLowerCase() === 'basic') return { authType: 'basic', authUsername: '', authPassword: '' };
      if ((scheme.scheme || '').toLowerCase() === 'bearer') return { authType: 'bearer', authToken: '' };
      return { authType: 'none' };
    case 'apiKey':
      return { authType: 'apikey', authApiKeyName: scheme.name || '', authApiKeyValue: '' };
    case 'oauth2':
      return { authType: 'bearer', authToken: '' };
    default:
      return { authType: 'none' };
  }
}

function buildRequestFromOperation(
  path: string,
  method: string,
  op: OpenApiOperation,
  pathItem: OpenApiPath,
  spec: Record<string, unknown>,
  baseUrl: string,
  defaultId: string,
): HttpRequestItem {
  // 解析 parameters
  const paramsList: HttpHeader[] = [];
  const headerList: HttpHeader[] = [];
  const pathVars: HttpHeader[] = [];
  const formDataList: HttpHeader[] = [];
  const urlencodedList: HttpHeader[] = [];

  for (const p of collectParameters(op, pathItem.parameters as OpenApiParameter[] | undefined, spec)) {
    // Swagger 2.0 才有 formData/body
    if (p.in === 'formData') formDataList.push({ key: p.name, value: p.default !== undefined ? String(p.default) : '' });
    else if (p.in === 'query') paramsList.push({ key: p.name, value: p.default !== undefined ? String(p.default) : '' });
    else if (p.in === 'header') headerList.push({ key: p.name, value: p.default !== undefined ? String(p.default) : '' });
    else if (p.in === 'path') pathVars.push({ key: p.name, value: p.default !== undefined ? String(p.default) : '' });
    else if (p.in === 'cookie') headerList.push({ key: 'Cookie', value: `${p.name}=` });
  }

  // 解析 requestBody
  let bodyType: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'text' | 'xml' = 'none';
  let body = '';
  const rb = op.requestBody;
  if (rb) {
    const content = rb.content || {};
    const json = content['application/json'];
    const form = content['multipart/form-data'];
    const urlenc = content['application/x-www-form-urlencoded'];
    const text = content['text/plain'];
    const xml = content['application/xml'] || content['text/xml'];
    if (json?.schema) {
      bodyType = 'json';
      const ex = exampleFromSchema(json.schema, spec);
      body = ex !== undefined ? JSON.stringify(ex, null, 2) : '';
      if (json.example !== undefined) body = JSON.stringify(json.example, null, 2);
    } else if (form) {
      bodyType = 'form-data';
      // 尝试从 schema 收集字段
      const sch = form.schema;
      if (sch?.properties) {
        for (const [k, v] of Object.entries(sch.properties)) {
          formDataList.push({ key: k, value: v.default !== undefined ? String(v.default) : '' });
        }
      }
    } else if (urlenc) {
      bodyType = 'x-www-form-urlencoded';
      const sch = urlenc.schema;
      if (sch?.properties) {
        for (const [k, v] of Object.entries(sch.properties)) {
          urlencodedList.push({ key: k, value: v.default !== undefined ? String(v.default) : '' });
        }
      }
    } else if (text) {
      bodyType = 'text';
      const ex = exampleFromSchema(text.schema, spec);
      body = ex !== undefined ? String(ex) : '';
    } else if (xml) {
      bodyType = 'xml';
      const ex = exampleFromSchema(xml.schema, spec);
      body = ex !== undefined ? JSON.stringify(ex) : '';
    }
  }
  // Swagger 2.0: body parameter
  const sw2Body = (op.parameters || []).find((p) => p.in === 'body');
  if (sw2Body) {
    bodyType = 'json';
    const ex = exampleFromSchema(sw2Body.schema, spec);
    body = ex !== undefined ? JSON.stringify(ex, null, 2) : '';
  }

  // 路径参数替换为占位符（EasyPostman 用 {{var}}）
  let urlPath = path;
  pathVars.forEach((pv) => {
    urlPath = urlPath.replace(`{${pv.key}}`, `{{${pv.key}}}`);
  });
  // 未声明的路径占位符也补全
  const placeholders = path.match(/\{([^}]+)\}/g) || [];
  for (const ph of placeholders) {
    const key = ph.substring(1, ph.length - 1);
    if (!pathVars.find((p) => p.key === key)) {
      pathVars.push({ key, value: '' });
    }
  }
  const fullUrl = baseUrl + urlPath;

  // 安全
  const secDefs = (spec.components as { securitySchemes?: Record<string, OpenApiSecurityScheme> } | undefined)?.securitySchemes
    || (spec.securityDefinitions as Record<string, OpenApiSecurityScheme> | undefined);
  const auth = buildAuthFromSecurity(op.security, secDefs);

  const description = [
    op.summary,
    op.description,
    op.deprecated ? '⚠️ 已弃用' : '',
  ].filter(Boolean).join('\n\n');

  const name = op.summary || op.operationId || `${method.toUpperCase()} ${path}`;
  return {
    ...createEmptyRequest(defaultId, name, method.toUpperCase()),
    url: fullUrl,
    description,
    headersList: headerList,
    paramsList,
    pathVariablesList: pathVars,
    formDataList,
    urlencodedList,
    bodyType,
    body,
    ...auth,
  };
}

export interface ParsedSpec {
  collectionName: string;
  collectionDescription: string;
  // tag -> requests
  groups: { name: string; description?: string; requests: HttpRequestItem[] }[];
  untaggedRequests: HttpRequestItem[];
}

export function parseOpenApi(text: string): ParsedSpec {
  const spec = JSON.parse(text) as Record<string, unknown>;
  const info = (spec.info as { title?: string; description?: string; version?: string } | undefined) || {};
  const collectionName = info.title || 'OpenAPI Import';
  const collectionDescription = [info.description, info.version ? `Version: ${info.version}` : ''].filter(Boolean).join('\n');
  const baseUrl = getBaseUrl(spec);
  const paths = (spec.paths as Record<string, OpenApiPath> | undefined) || {};

  // tag -> { desc, requests }
  const tagMap = new Map<string, { name: string; description?: string; requests: HttpRequestItem[] }>();
  // 预填 tags 描述
  for (const t of ((spec.tags as { name: string; description?: string }[] | undefined) || [])) {
    if (!tagMap.has(t.name)) tagMap.set(t.name, { name: t.name, description: t.description, requests: [] });
  }
  const untagged: HttpRequestItem[] = [];

  let idCounter = 0;
  const nextId = () => `openapi-import-${Date.now()}-${idCounter++}`;

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      const req = buildRequestFromOperation(path, method, op, pathItem, spec, baseUrl, nextId());
      const tags = op.tags && op.tags.length > 0 ? op.tags : ['未分组'];
      for (const tag of tags) {
        let entry = tagMap.get(tag);
        if (!entry) {
          entry = { name: tag, requests: [] };
          tagMap.set(tag, entry);
        }
        entry.requests.push(req);
      }
    }
  }

  return {
    collectionName,
    collectionDescription,
    groups: Array.from(tagMap.values()),
    untaggedRequests: untagged,
  };
}

export function isOpenApi(text: string): boolean {
  try {
    const s = JSON.parse(text);
    return typeof s === 'object' && s && (('openapi' in s) || ('swagger' in s));
  } catch {
    return false;
  }
}
