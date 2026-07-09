import axios from 'axios';
import type { CollectionNode, Environment, HttpRequestItem, HttpResponseVO } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const collectionApi = {
  getTree: () => api.get<{ success: boolean; data: CollectionNode[] }>('/collections').then((r) => r.data),

  createGroup: (parentId: string | null, name: string) =>
    api
      .post<{ success: boolean; data: CollectionNode }>('/collections/groups', { parentId, name })
      .then((r) => r.data),

  renameGroup: (id: string, name: string) =>
    api.put<{ success: boolean }>(`/collections/groups/${id}`, { name }).then((r) => r.data),

  createRequest: (parentId: string | null, name: string) =>
    api
      .post<{ success: boolean; data: HttpRequestItem }>('/collections/requests', { parentId, name })
      .then((r) => r.data),

  saveRequest: (id: string, request: HttpRequestItem) =>
    api.put<{ success: boolean }>(`/collections/requests/${id}`, request).then((r) => r.data),

  moveNode: (id: string, targetParentId: string | null, targetIndex: number) =>
    api.put<{ success: boolean }>(`/collections/${id}/move`, { targetParentId, targetIndex }).then((r) => r.data),

  deleteNode: (id: string) => api.delete<{ success: boolean }>(`/collections/${id}`).then((r) => r.data),
};

export const environmentApi = {
  getAll: () => api.get<{ success: boolean; data: Environment[]; activeId: string }>('/environments').then((r) => r.data),

  create: (name: string) =>
    api.post<{ success: boolean; data: Environment }>('/environments', { name }).then((r) => r.data),

  update: (id: string, env: Environment) =>
    api.put<{ success: boolean }>(`/environments/${id}`, env).then((r) => r.data),

  delete: (id: string) => api.delete<{ success: boolean }>(`/environments/${id}`).then((r) => r.data),

  activate: (id: string) =>
    api.post<{ success: boolean }>(`/environments/${id}/activate`).then((r) => r.data),
};

export const requestApi = {
  send: (request: HttpRequestItem) =>
    api.post<{ success: boolean; data: HttpResponseVO }>('/request/send', request).then((r) => r.data),
};

export const healthApi = {
  check: () => api.get<{ status: string }>('/health').then((r) => r.data),
};

export interface Workspace {
  id: string;
  name: string;
  type: string;
  path: string;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryItem {
  method: string;
  url: string;
  responseCode: number;
  requestTime: number;
  request: {
    method: string;
    url: string;
    body: string;
    bodyType: string;
    headers: Record<string, string>;
    headersList: Array<{ enabled: boolean; key: string; value: string; description?: string }>;
    paramsList: Array<{ enabled: boolean; key: string; value: string; description?: string }>;
    formDataList: Array<{ enabled: boolean; key: string; value: string; type?: string; description?: string }>;
    urlencodedList: Array<{ enabled: boolean; key: string; value: string; description?: string }>;
    id?: string;
    httpVersion?: string;
    prescript?: string;
    postscript?: string;
  };
  response: {
    code: number;
    body: string;
    costMs: number;
    headers: Record<string, string>;
    bodySize?: number;
    headersSize?: number;
    protocol?: string;
    threadName?: string;
    httpEventInfo?: {
      localAddress?: string;
      remoteAddress?: string;
      queueStart?: number;
      callStart?: number;
      proxySelectStart?: number;
      proxySelectEnd?: number;
      dnsStart?: number;
      dnsEnd?: number;
      connectStart?: number;
      secureConnectStart?: number;
      secureConnectEnd?: number;
      connectEnd?: number;
      connectionAcquired?: number;
      requestHeadersStart?: number;
      requestHeadersEnd?: number;
      requestBodyStart?: number;
      requestBodyEnd?: number;
      responseHeadersStart?: number;
      responseHeadersEnd?: number;
      responseBodyStart?: number;
      responseBodyEnd?: number;
      connectionReleased?: number;
      callEnd?: number;
      callFailed?: number;
      canceled?: number;
      queueingCost?: number;
      stalledCost?: number;
      protocol?: string;
      tlsVersion?: string;
      errorMessage?: string;
    };
  };
}

export const workspaceApi = {
  getAll: () => api.get<{ success: boolean; data: Workspace[] }>('/workspaces').then((r) => r.data),
  getCurrent: () => api.get<{ success: boolean; data: Workspace }>('/workspaces/current').then((r) => r.data),
  create: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<{ success: boolean; data: Workspace }>('/workspaces', workspace).then((r) => r.data),
  switch: (id: string) => api.put<{ success: boolean }>(`/workspaces/${id}/switch`).then((r) => r.data),
  rename: (id: string, name: string) =>
    api.put<{ success: boolean }>(`/workspaces/${id}/rename`, { name }).then((r) => r.data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/workspaces/${id}`).then((r) => r.data),
};

export const historyApi = {
  getHistory: () => api.get<{ success: boolean; data: HistoryItem[] }>('/history').then((r) => r.data),
  clear: () => api.delete<{ success: boolean }>('/history').then((r) => r.data),
};
