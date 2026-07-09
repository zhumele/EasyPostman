import axios from 'axios';
import type { CollectionNode, Environment, HttpRequestItem, ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const collectionApi = {
  getTree(): Promise<ApiResponse<CollectionNode[]>> {
    return api.get('/collections').then(res => res.data);
  },

  createGroup(name: string, description?: string, parentId?: string): Promise<ApiResponse<CollectionNode>> {
    return api.post('/collections/groups', { name, description, parentId }).then(res => res.data);
  },

  updateGroup(id: string, data: Partial<{ name: string; description: string }>): Promise<ApiResponse> {
    return api.put(`/collections/groups/${id}`, data).then(res => res.data);
  },

  createRequest(name: string, method: string, url: string, parentId?: string): Promise<ApiResponse<HttpRequestItem>> {
    return api.post('/collections/requests', { name, method, url, parentId }).then(res => res.data);
  },

  updateRequest(id: string, data: Partial<HttpRequestItem>): Promise<ApiResponse> {
    return api.put(`/collections/requests/${id}`, data).then(res => res.data);
  },

  deleteNode(id: string): Promise<ApiResponse> {
    return api.delete(`/collections/${id}`).then(res => res.data);
  },
};

export const environmentApi = {
  getAll(): Promise<ApiResponse<Environment[]>> {
    return api.get('/environments').then(res => res.data);
  },

  create(env: Partial<Environment>): Promise<ApiResponse<Environment>> {
    return api.post('/environments', env).then(res => res.data);
  },

  update(id: string, env: Partial<Environment>): Promise<ApiResponse> {
    return api.put(`/environments/${id}`, env).then(res => res.data);
  },

  delete(id: string): Promise<ApiResponse> {
    return api.delete(`/environments/${id}`).then(res => res.data);
  },

  activate(id: string): Promise<ApiResponse> {
    return api.post(`/environments/${id}/activate`).then(res => res.data);
  },
};

export const requestApi = {
  send(item: HttpRequestItem): Promise<ApiResponse<any>> {
    return api.post('/request/send', item).then(res => res.data);
  },
};

export const healthApi = {
  check(): Promise<{ status: string; timestamp: number }> {
    return api.get('/health').then(res => res.data);
  },

  info(): Promise<{ app: string; version: string; dataDir: string }> {
    return api.get('/health/info').then(res => res.data);
  },
};
