export interface HttpHeader {
  key: string;
  value: string;
}

export interface HttpRequestItem {
  id: string;
  name: string;
  description: string;
  method: string;
  url: string;
  protocol: string;
  headersList: HttpHeader[];
  bodyType: string;
  body: string;
  pathVariablesList: HttpHeader[];
  paramsList: HttpHeader[];
  formDataList: HttpHeader[];
  urlencodedList: HttpHeader[];
  authType: string;
  authUsername: string;
  authPassword: string;
  authToken: string;
  authApiKeyName: string;
  authApiKeyValue: string;
  authApiKeyPlacement: string;
  proxyPolicy: string;
  httpVersion: string;
  prescript: string;
  postscript: string;
  response: unknown[];
  variables?: Variable[];
}

export interface CollectionNode {
  id: string;
  name: string;
  type: 'group' | 'request';
  children?: CollectionNode[];
  request?: HttpRequestItem;
  method?: string;
  description?: string;
  authType?: string;
  prescript?: string;
  postscript?: string;
  headers?: HttpHeader[];
  variables?: HttpHeader[];
}

export interface Variable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variableList: Variable[];
  active: boolean;
}

export interface HttpResponseVO {
  statusCode: number;
  durationMs: number;
  headers: HttpHeader[];
  contentType: string;
  body: string;
}

export type SidebarTabId =
  | 'collection'
  | 'environment'
  | 'workspace'
  | 'functional-test'
  | 'performance-test'
  | 'toolbox'
  | 'history';

export const METHOD_COLORS: Record<string, string> = {
  GET: '#1677ff',
  POST: '#52c41a',
  PUT: '#faad14',
  DELETE: '#ff4d4f',
  PATCH: '#722ed1',
  HEAD: '#8c8c8c',
  OPTIONS: '#8c8c8c',
  TRACE: '#8c8c8c',
};

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE'] as const;

export const BODY_TYPES = ['none', 'json', 'form-data', 'x-www-form-urlencoded', 'text', 'xml', 'graphql'] as const;

export const AUTH_TYPES = ['none', 'basic', 'bearer', 'apikey'] as const;

export function createEmptyRequest(id: string, name: string, method = 'GET'): HttpRequestItem {
  return {
    id,
    name,
    description: '',
    method,
    url: '',
    protocol: 'HTTP',
    headersList: [],
    bodyType: 'none',
    body: '',
    pathVariablesList: [],
    paramsList: [],
    formDataList: [],
    urlencodedList: [],
    authType: 'none',
    authUsername: '',
    authPassword: '',
    authToken: '',
    authApiKeyName: '',
    authApiKeyValue: '',
    authApiKeyPlacement: 'header',
    proxyPolicy: 'no-proxy',
    httpVersion: 'HTTP/1.1',
    prescript: '',
    postscript: '',
    response: [],
  };
}

export function createEmptyEnvironment(id: string, name: string): Environment {
  return {
    id,
    name,
    variableList: [],
    active: false,
  };
}
