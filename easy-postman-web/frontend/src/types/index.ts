export interface HttpHeader {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface HttpParam {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface HttpFormData {
  key: string;
  value: string;
  type?: 'text' | 'file';
  enabled?: boolean;
}

export interface HttpFormUrlencoded {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface SavedResponse {
  name: string;
  body: string;
  headers: HttpHeader[];
  statusCode: number;
}

export interface HttpRequestItem {
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  protocol: string;
  headersList: HttpHeader[];
  bodyType: string;
  body: string;
  pathVariablesList: HttpParam[];
  paramsList: HttpParam[];
  formDataList: HttpFormData[];
  urlencodedList: HttpFormUrlencoded[];
  authType: string;
  authUsername: string;
  authPassword: string;
  authToken: string;
  authApiKeyName: string;
  authApiKeyValue: string;
  authApiKeyPlacement: string;
  followRedirects: boolean | null;
  cookieJarEnabled: boolean | null;
  httpVersion: string;
  requestTimeoutMs: number | null;
  prescript: string;
  postscript: string;
  response: SavedResponse[];
}

export interface RequestGroup {
  id: string;
  name: string;
  description: string;
  authType: string;
  prescript: string;
  postscript: string;
  headers: HttpHeader[];
  variables: HttpParam[];
}

export interface CollectionNode {
  id: string;
  type: 'group' | 'request';
  name: string;
  children?: CollectionNode[];
  request?: HttpRequestItem;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled?: boolean;
  secret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variableList: EnvironmentVariable[];
  active: boolean;
}

export interface HttpResponseVO {
  statusCode: number;
  headers: HttpHeader[];
  body: string;
  durationMs: number;
  contentType: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  activeId?: string;
}
