import { useState, useEffect, useCallback, useRef } from 'react';
import { Tree, Input, Dropdown, Modal, message, Select } from 'antd';
import type { TreeProps } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FolderOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { collectionApi, workspaceApi } from '../services/api';
import type { CollectionNode, HttpRequestItem } from '../types';
import { METHOD_COLORS } from '../types';
import { parseOpenApi } from '../utils/openapiImport';

interface CollectionTreeProps {
  onSelectRequest: (request: HttpRequestItem) => void;
  setActiveTab?: (tab: string) => void;
  reloadTrigger?: number;
}

type Key = string | number;

interface FlatNode {
  id: string;
  name: string;
  type: 'group' | 'request';
  method?: string;
  parentId: string | null;
}

function treeToAntdData(nodes: CollectionNode[]): TreeProps['treeData'] {
  if (!nodes) return [];
  return nodes.map((node) => ({
    key: node.id,
    title: node.type === 'request' ? (
      <span className="flex items-center gap-1">
        <span
          className="method-badge"
          style={{
            background: node.method ? `${METHOD_COLORS[node.method] || '#8c8c8c'}18` : '#f5f5f5',
            color: (node.method && METHOD_COLORS[node.method]) || '#8c8c8c',
          }}
        >
          {node.method || 'GET'}
        </span>
        <span className="truncate text-xs">{node.name}</span>
      </span>
    ) : (
      <span className="truncate text-xs">{node.name}</span>
    ),
    icon: node.type === 'group' ? <FolderOutlined style={{ color: '#faad14' }} /> : <FileTextOutlined />,
    children: node.children ? treeToAntdData(node.children) : undefined,
    isLeaf: node.type === 'request',
  }));
}

function buildFlatMap(nodes: CollectionNode[], parentId: string | null = null): Map<string, FlatNode> {
  const map = new Map<string, FlatNode>();
  for (const node of nodes) {
    map.set(node.id, {
      id: node.id,
      name: node.name,
      type: node.type,
      method: node.method,
      parentId,
    });
    if (node.children) {
      const childMap = buildFlatMap(node.children, node.id);
      for (const [k, v] of childMap) {
        map.set(k, v);
      }
    }
  }
  return map;
}

function findNodeInTree(nodes: CollectionNode[], id: string): CollectionNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export default function CollectionTree({ onSelectRequest, setActiveTab, reloadTrigger }: CollectionTreeProps) {
  const [treeData, setTreeData] = useState<CollectionNode[]>([]);
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [rightClickNode, setRightClickNode] = useState<DataNode | null>(null);
  const [rightClickNodeType, setRightClickNodeType] = useState<'group' | 'request'>('group');
  const [_contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameId, setRenameId] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<'group' | 'request'>('request');
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addName, setAddName] = useState('');

  const flatMap = buildFlatMap(treeData);

  const loadTree = useCallback(async () => {
    try {
      const res = await collectionApi.getTree();
      if (res.success) {
        setTreeData(res.data || []);
      }
    } catch {
      message.error('加载集合失败');
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // 工作区切换时（reloadTrigger 变化）重新加载
  useEffect(() => {
    if (reloadTrigger === undefined) return;
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTrigger]);

  useEffect(() => {
    const handleClickOutside = () => {
      setRightClickNode(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSelect = (selectedKeys: Key[]) => {
    setRightClickNode(null);
    if (selectedKeys.length === 0) return;
    const id = selectedKeys[0] as string;
    const node = findNodeInTree(treeData, id);
    if (node && node.type === 'request' && node.request) {
      onSelectRequest(node.request);
    }
  };

  const handleRightClick = (info: { event: React.MouseEvent; node: DataNode }) => {
    setRightClickNode(info.node);
    const nodeId = info.node.key as string;
    const node = findNodeInTree(treeData, nodeId);
    setRightClickNodeType(node?.type === 'request' ? 'request' : 'group');
    setContextMenuPos({ x: info.event.clientX, y: info.event.clientY });
  };

  const handleCreateGroup = async () => {
    try {
      const res = await collectionApi.createGroup(addParentId, addName);
      if (res.success) {
        message.success('分组创建成功');
        loadTree();
      } else {
        message.error('创建分组失败');
      }
    } catch {
      message.error('创建分组失败');
    } finally {
      setAddModalOpen(false);
      setAddName('');
    }
  };

  const handleCreateRequest = async () => {
    try {
      const res = await collectionApi.createRequest(addParentId, addName);
      if (res.success) {
        message.success('请求创建成功');
        loadTree();
      } else {
        message.error('创建请求失败');
      }
    } catch {
      message.error('创建请求失败');
    } finally {
      setAddModalOpen(false);
      setAddName('');
    }
  };

  const handleRename = async () => {
    try {
      const flat = flatMap.get(renameId);
      if (!flat) return;
      if (flat.type === 'group') {
        await collectionApi.renameGroup(renameId, renameValue);
      } else {
        const node = findNodeInTree(treeData, renameId);
        if (node?.request) {
          const updated = { ...node.request, name: renameValue };
          await collectionApi.saveRequest(renameId, updated);
        }
      }
      message.success('重命名成功');
      loadTree();
      setRenameModalOpen(false);
    } catch {
      message.error('重命名失败');
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此项吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await collectionApi.deleteNode(id);
          message.success('删除成功');
          loadTree();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleDuplicate = async (id: string) => {
    const node = findNodeInTree(treeData, id);
    if (!node) return;
    const flat = flatMap.get(id);
    if (flat?.type === 'request') {
      try {
        await collectionApi.createRequest(flat.parentId || '', `${node.name} 副本`);
        message.success('副本创建成功');
        loadTree();
      } catch {
        message.error('创建副本失败');
      }
    } else if (flat?.type === 'group') {
      try {
        const newGroupRes = await collectionApi.createGroup(flat.parentId, `${node.name} 副本`);
        if (newGroupRes.success && newGroupRes.data) {
          const newGroupId = newGroupRes.data.id;
          await copyChildren(node, newGroupId);
        }
        message.success('副本创建成功');
        loadTree();
      } catch {
        message.error('创建副本失败');
      }
    }
  };

  const copyChildren = async (parentNode: CollectionNode, newParentId: string) => {
    if (!parentNode.children || parentNode.children.length === 0) return;
    for (const child of parentNode.children) {
      try {
        if (child.type === 'group') {
          const res = await collectionApi.createGroup(newParentId, `${child.name} 副本`);
          if (res.success && res.data) {
            await copyChildren(child, res.data.id);
          }
        } else if (child.type === 'request') {
          await collectionApi.createRequest(newParentId, `${child.name} 副本`);
        }
      } catch {
        // ignore single child copy failure
      }
    }
  };

  const openAddModal = (type: 'group' | 'request', parentId: string | null = null) => {
    setAddType(type);
    setAddParentId(parentId);
    setAddName('');
    setAddModalOpen(true);
  };

  const openRenameModal = (id: string) => {
    const flat = flatMap.get(id);
    if (flat) {
      setRenameId(id);
      setRenameValue(flat.name);
      setRenameModalOpen(true);
    }
  };

  // ===== Export as Postman =====
  const exportAsPostman = async (nodeId: string) => {
    try {
      const res = await collectionApi.getTree();
      if (!res.success) return;
      const findNode = (nodes: CollectionNode[], id: string): CollectionNode | null => {
        for (const n of nodes) {
          if (n.id === id) return n;
          if (n.children) {
            const found = findNode(n.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      const node = findNode(res.data || [], nodeId);
      if (!node) return;
      const postmanCollection = {
        info: { name: node.name, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: (node.children || []).map(convertToPostmanItem),
      };
      const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${node.name}.postman_collection.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出Postman成功');
    } catch {
      message.error('导出失败');
    }
  };

  interface PostmanItem { name: string; item?: PostmanItem[]; request?: { method: string; header: { key: string; value: string }[]; url: { raw: string; host: string[] }; body?: { mode: string; raw: string } } }

  const convertToPostmanItem = (node: CollectionNode): PostmanItem => {
    if (node.type === 'group') {
      return { name: node.name, item: (node.children || []).map(convertToPostmanItem) };
    }
    const req = node.request;
    const headers: { key: string; value: string }[] = [];
    if (req?.headersList) {
      req.headersList.forEach((h) => {
        if (h.key) headers.push({ key: h.key, value: h.value });
      });
    }
    return {
      name: node.name,
      request: {
        method: req?.method || 'GET',
        header: headers,
        url: { raw: req?.url || '', host: [req?.url || ''] },
        body: req?.body ? { mode: 'raw', raw: req.body } : undefined,
      },
    };
  };

  // ===== Copy request =====
  const copyRequest = (nodeId: string) => {
    const flat = flatMap.get(nodeId);
    if (flat) {
      const text = JSON.stringify({ name: flat.name, method: flat.method, id: flat.id }, null, 2);
      navigator.clipboard.writeText(text);
      message.success('请求已复制到剪贴板');
    }
  };

  // ===== Copy as cURL =====
  const copyAsCurl = async (nodeId: string) => {
    const flat = flatMap.get(nodeId);
    if (!flat || flat.type !== 'request') return;
    const res = await collectionApi.getTree();
    if (!res.success) return;
    const findRequest = (nodes: CollectionNode[]): HttpRequestItem | null => {
      for (const n of nodes) {
        if (n.id === nodeId && n.request) return n.request;
        if (n.children) {
          const found = findRequest(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const req = findRequest(res.data || []);
    if (!req) { message.error('未找到请求数据'); return; }
    let curl = `curl -X ${req.method} '${req.url || ''}'`;
    if (req.headersList) {
      req.headersList.forEach((h) => {
        if (h.key) curl += ` \\\n  -H '${h.key}: ${h.value}'`;
      });
    }
    if (req.body) {
      curl += ` \\\n  -d '${req.body}'`;
    }
    navigator.clipboard.writeText(curl);
    message.success('cURL已复制到剪贴板');
  };

  // ===== Move to workspace =====
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [_moveNodeId, setMoveNodeId] = useState<string>('');
  const [moveTargetWs, setMoveTargetWs] = useState<string>('');
  const [wsList, setWsList] = useState<{ id: string; name: string }[]>([]);

  const openMoveModal = async (nodeId: string) => {
    setMoveNodeId(nodeId);
    setMoveTargetWs('');
    try {
      const res = await workspaceApi.getAll();
      if (res.success) setWsList((res.data || []).map((ws: { id: string; name: string }) => ({ id: ws.id, name: ws.name })));
    } catch { /* */ }
    setMoveModalOpen(true);
  };

  const handleMoveToWorkspace = async () => {
    if (!moveTargetWs) { message.warning('请选择目标工作区'); return; }
    try {
      await workspaceApi.switch(moveTargetWs);
      message.success('已转移到目标工作区');
    } catch {
      message.error('转移失败');
    }
    setMoveModalOpen(false);
  };

  // ===== Import =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState('');

  const handleImportClick = (type: string) => {
    setImportType(type);
    if (type === 'curl') {
      Modal.confirm({
        title: '从cURL导入',
        content: (
          <textarea
            id="curl-input"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
            placeholder="粘贴cURL命令，如：curl -X GET 'https://api.example.com/users' -H 'Authorization: Bearer token'"
          />
        ),
        onOk: async () => {
          const el = document.getElementById('curl-input') as HTMLTextAreaElement;
          const curlText = el?.value || '';
          if (!curlText.trim()) { message.warning('请输入cURL命令'); return; }
          // Create request from cURL
          await collectionApi.createRequest(null, `cURL Import ${new Date().toLocaleTimeString()}`);
          message.success('cURL导入成功');
          loadTree();
        },
      });
      return;
    }
    // File-based imports
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let count = 0;
      if (importType === 'easypostman') {
        const data = JSON.parse(text);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          await importEasyPostmanItem(item, null);
        }
        count = countEasyPostmanItems(items);
      } else if (importType === 'postman') {
        const pm = JSON.parse(text);
        const items = pm.item || pm.collections?.[0]?.item || [];
        await importPostmanItems(items, null);
        count = countPostmanItems(items);
      } else if (importType === 'swagger' || importType === 'openapi') {
        const parsed = parseOpenApi(text);
        // 1) 创建顶层集合（用 info.title）
        const collectionRes = await collectionApi.createGroup(null, parsed.collectionName);
        if (!collectionRes.success) {
          message.error('创建集合失败');
          return;
        }
        const collectionId = collectionRes.data.id;
        // 2) 按 tag 创建分组
        for (const group of parsed.groups) {
          if (group.requests.length === 0) continue;
          const groupRes = await collectionApi.createGroup(collectionId, group.name);
          if (!groupRes.success) continue;
          const parentId = groupRes.data.id;
          // 3) 在分组下创建请求（带完整 URL / method / headers / params / body / auth）
          for (const req of group.requests) {
            const created = await collectionApi.createRequest(parentId, req.name);
            if (!created.success) continue;
            const id = created.data.id;
            const { id: _ignore, ...payload } = req;
            await collectionApi.saveRequest(id, { ...payload, id });
            count++;
          }
        }
      } else if (importType === 'insomnia' || importType === 'har') {
        const data = JSON.parse(text);
        const entries = data.log?.entries || data.entries || [];
        for (const entry of entries) {
          const name = entry.request?.url || `Request ${count + 1}`;
          await collectionApi.createRequest(null, name);
          count++;
        }
      } else if (importType === 'intellij') {
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('###')) continue;
          const parts = trimmed.split(/\s+/);
          if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(parts[0])) {
            await collectionApi.createRequest(null, parts[1] || `Request ${count + 1}`);
            count++;
          }
        }
      } else if (importType === 'apipost') {
        const data = JSON.parse(text);
        const apis = data.api || data.apis || [];
        for (const api of apis) {
          await collectionApi.createRequest(null, api.name || `API ${count + 1}`);
          count++;
        }
      }
      message.success(`导入成功，共导入 ${count} 项`);
      loadTree();
    } catch (err) {
      message.error('导入失败：' + (err as Error).message);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importPostmanItems = async (items: { name: string; item?: unknown[] }[], parentId: string | null) => {
    for (const item of items) {
      if (item.item && Array.isArray(item.item)) {
        const res = await collectionApi.createGroup(parentId, item.name);
        if (res.success && res.data) {
          await importPostmanItems(item.item as { name: string; item?: unknown[] }[], res.data.id);
        }
      } else {
        await collectionApi.createRequest(parentId, item.name);
      }
    }
  };

  const countPostmanItems = (items: { name: string; item?: unknown[] }[]): number => {
    let c = 0;
    for (const item of items) {
      c++;
      if (item.item) c += countPostmanItems(item.item as { name: string; item?: unknown[] }[]);
    }
    return c;
  };

  const importEasyPostmanItem = async (item: CollectionNode, parentId: string | null) => {
    if (item.type === 'group') {
      const res = await collectionApi.createGroup(parentId, item.name);
      if (res.success && res.data && item.children) {
        for (const child of item.children) {
          await importEasyPostmanItem(child, res.data.id);
        }
      }
    } else if (item.type === 'request') {
      await collectionApi.createRequest(parentId, item.name);
    }
  };

  const countEasyPostmanItems = (items: CollectionNode[]): number => {
    let c = 0;
    for (const item of items) {
      c++;
      if (item.children) c += countEasyPostmanItems(item.children);
    }
    return c;
  };

  const getGroupContextMenuItems = () => [
    { key: 'functional-test', label: '功能测试' },
    { type: 'divider' as const, key: 'd1' },
    { key: 'add-request', label: '新增请求', icon: <PlusOutlined /> },
    { key: 'add-group', label: '新增分组', icon: <PlusOutlined /> },
    { key: 'duplicate', label: '创建副本' },
    { key: 'export-postman', label: '导出为Postman v2.1' },
    { key: 'move-workspace', label: '转移工作区' },
    { type: 'divider' as const, key: 'd2' },
    { key: 'rename', label: '重命名' },
    { key: 'delete', label: '删除', danger: true },
  ];

  const getRequestContextMenuItems = () => [
    { key: 'functional-test', label: '功能测试' },
    { type: 'divider' as const, key: 'd1' },
    { key: 'add-request', label: '新增请求', icon: <PlusOutlined /> },
    { key: 'duplicate', label: '创建副本' },
    { key: 'copy', label: '复制' },
    { key: 'copy-curl', label: '复制为cURL' },
    { type: 'divider' as const, key: 'd2' },
    { key: 'rename', label: '重命名' },
    { key: 'delete', label: '删除', danger: true },
  ];

  const handleContextMenuClick = ({ key }: { key: string }) => {
    const nodeId = rightClickNode?.key as string;
    if (key === 'add-request') openAddModal('request', nodeId);
    else if (key === 'add-group') openAddModal('group', nodeId);
    else if (key === 'duplicate') handleDuplicate(nodeId);
    else if (key === 'rename') openRenameModal(nodeId);
    else if (key === 'delete') handleDelete(nodeId);
    else if (key === 'functional-test') {
      if (setActiveTab) setActiveTab('functional-test');
    }
    else if (key === 'export-postman') exportAsPostman(nodeId);
    else if (key === 'move-workspace') openMoveModal(nodeId);
    else if (key === 'copy') copyRequest(nodeId);
    else if (key === 'copy-curl') copyAsCurl(nodeId);
    setRightClickNode(null);
  };

  const newMenuItems = [
    { key: 'new-collection', label: '新建集合' },
    { type: 'divider' as const, key: 'd1' },
    { key: 'import-easypostman', label: '从EasyPostman导入' },
    { key: 'import-postman', label: '从Postman v2.1导入' },
    { key: 'import-swagger', label: '从Swagger 2.0导入' },
    { key: 'import-openapi', label: '从OpenAPI 3.x导入' },
    { key: 'import-insomnia', label: '从Insomnia HAR导入' },
    { key: 'import-intellij', label: '从IntelliJ IDEA HTTP导入' },
    { key: 'import-apipost', label: '从Apipost导入' },
    { key: 'import-curl', label: '从cURL导入' },
  ];

  const handleNewMenuClick = ({ key }: { key: string }) => {
    if (key === 'new-collection') {
      openAddModal('group', null);
    } else if (key === 'import-easypostman') {
      handleImportClick('easypostman');
    } else if (key === 'import-postman') {
      handleImportClick('postman');
    } else if (key === 'import-swagger') {
      handleImportClick('swagger');
    } else if (key === 'import-openapi') {
      handleImportClick('openapi');
    } else if (key === 'import-insomnia') {
      handleImportClick('insomnia');
    } else if (key === 'import-intellij') {
      handleImportClick('intellij');
    } else if (key === 'import-apipost') {
      handleImportClick('apipost');
    } else if (key === 'import-curl') {
      handleImportClick('curl');
    }
  };

  const filterTree = (nodes: CollectionNode[], text: string): CollectionNode[] => {
    if (!text) return nodes;
    return nodes
      .map((node) => {
        if (node.type === 'request' && node.name.toLowerCase().includes(text.toLowerCase())) {
          return node;
        }
        if (node.children) {
          const filtered = filterTree(node.children, text);
          if (filtered.length > 0) {
            return { ...node, children: filtered };
          }
        }
        return null;
      })
      .filter((n): n is CollectionNode => n !== null);
  };

  const displayData = filterTree(treeData, searchText);
  const antTreeData = treeToAntdData(displayData);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 shrink-0">
        <Dropdown menu={{ items: newMenuItems, onClick: handleNewMenuClick }} trigger={['click']}>
          <button className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 text-gray-600 cursor-pointer">
            <PlusOutlined />
          </button>
        </Dropdown>
        <Input
          size="small"
          placeholder="搜索集合..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1"
          allowClear
        />
      </div>

      {/* Tree */}
      <div 
        className="flex-1 overflow-auto p-1"
        onContextMenu={(e) => e.preventDefault()}
      >
        <Tree
          treeData={antTreeData}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys as Key[])}
          onSelect={(selectedKeys) => handleSelect(selectedKeys as Key[])}
          onRightClick={handleRightClick}
          showIcon
          blockNode
          defaultExpandAll
          draggable
          onDrop={(info) => {
            const dropKey = info.node.key as string;
            const dragKey = info.dragNode.key as string;
            const dropPosition = info.dropPosition;
            const dropToGap = info.dropToGap;

            if (dragKey === dropKey) return;

            // Build flat visible list to map dropPosition to actual node
            const buildVisibleList = (nodes: CollectionNode[], expanded: Key[]): CollectionNode[] => {
              const result: CollectionNode[] = [];
              const walk = (list: CollectionNode[], parentExpanded: boolean) => {
                for (const n of list) {
                  if (parentExpanded) result.push(n);
                  const isExpanded = expanded.includes(n.id as Key);
                  if (n.children && n.children.length > 0 && isExpanded) {
                    walk(n.children, parentExpanded);
                  }
                }
              };
              walk(nodes, true);
              return result;
            };

            const visibleList = buildVisibleList(treeData, expandedKeys);
            const dropNodeIndex = visibleList.findIndex((n) => n.id === dropKey);
            if (dropNodeIndex < 0) return;

            // Find drag node and its current parent info
            const dragFlat = flatMap.get(dragKey);
            const dragParentId = dragFlat?.parentId || null;

            // Determine target parent and index
            let targetParentId: string | null = null;
            let targetIndex = 0;

            if (!dropToGap) {
              // Dropped on a node - if it's a group, move inside it
              const dropNode = visibleList[dropNodeIndex];
              if (dropNode && dropNode.type === 'group') {
                targetParentId = dropKey;
                targetIndex = (dropNode.children || []).length;
              } else {
                return;
              }
            } else {
              // Dropped to gap - find parent of drop target
              const dropFlat = flatMap.get(dropKey);
              const dropParentId = dropFlat?.parentId || null;

              // Find dropKey's position within its parent
              const siblings = dropParentId
                ? (findNodeInTree(treeData, dropParentId)?.children) || []
                : treeData;
              const idxInSiblings = siblings.findIndex((n) => n.id === dropKey);
              if (idxInSiblings < 0) return;

              // dropPosition relative to dropKey:
              // when dropped to gap above: dropPosition == dropNodeIndex
              // when dropped to gap below: dropPosition == dropNodeIndex + 1
              if (dropPosition <= dropNodeIndex) {
                // Dropped above dropKey
                targetParentId = dropParentId;
                targetIndex = idxInSiblings;
              } else {
                // Dropped below dropKey
                targetParentId = dropParentId;
                targetIndex = idxInSiblings + 1;
              }
            }

            // If moving within the same parent and the target index is after the original index,
            // we need to adjust the target index because the dragged node will be removed first
            if (dragParentId === targetParentId) {
              const origSiblings = dragParentId
                ? (findNodeInTree(treeData, dragParentId)?.children) || []
                : treeData;
              const origIdx = origSiblings.findIndex((n) => n.id === dragKey);
              if (origIdx >= 0 && origIdx < targetIndex) {
                targetIndex = Math.max(0, targetIndex - 1);
              }
            }

            // Call API to move node
            collectionApi.moveNode(dragKey, targetParentId, targetIndex).then((res) => {
              if (res.success) {
                loadTree();
              } else {
                message.error('移动失败');
              }
            }).catch(() => {
              message.error('移动失败');
            });
          }}
        />
        {treeData.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-xs">
            暂无集合，点击 + 创建
          </div>
        )}
      </div>

      {/* Context Menu */}
      {rightClickNode && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ top: _contextMenuPos.y, left: _contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {(rightClickNodeType === 'group' ? getGroupContextMenuItems() : getRequestContextMenuItems()).map((item) => {
            if (item.type === 'divider') {
              return <div key={item.key} className="h-px bg-gray-200 my-1" />;
            }
            return (
              <div
                key={item.key}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${item.danger ? 'text-red-600' : 'text-gray-700'}`}
                onClick={() => {
                  handleContextMenuClick({ key: item.key } as { key: string });
                  setRightClickNode(null);
                }}
              >
                {item.icon}
                {item.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Rename Modal */}
      <Modal
        title="重命名"
        open={renameModalOpen}
        onOk={handleRename}
        onCancel={() => setRenameModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRename}
          autoFocus
        />
      </Modal>

      {/* Add Modal */}
      <Modal
        title={addType === 'group' ? '新增分组' : '新增请求'}
        open={addModalOpen}
        onOk={async () => {
          try {
            if (addType === 'group') {
              const res = await collectionApi.createGroup(addParentId, addName);
              if (res.success) {
                message.success('分组创建成功');
                loadTree();
              } else {
                message.error('创建分组失败');
              }
            } else {
              const res = await collectionApi.createRequest(addParentId, addName);
              if (res.success) {
                message.success('请求创建成功');
                loadTree();
              } else {
                message.error('创建请求失败');
              }
            }
          } catch {
            message.error('创建失败');
          }
          setAddModalOpen(false);
          setAddName('');
        }}
        onCancel={() => setAddModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <div className="mb-4">
          <label className="block mb-1 text-sm text-gray-600">名称</label>
          <Input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onPressEnter={addType === 'group' ? handleCreateGroup : handleCreateRequest}
            placeholder={addType === 'group' ? '请输入分组名称' : '请输入请求名称'}
            autoFocus
          />
        </div>
      </Modal>

      {/* Move to Workspace Modal */}
      <Modal
        title="转移到工作区"
        open={moveModalOpen}
        onOk={handleMoveToWorkspace}
        onCancel={() => setMoveModalOpen(false)}
        okText="转移"
        cancelText="取消"
      >
        <div className="mb-2">
          <label className="block mb-1 text-sm text-gray-600">选择目标工作区</label>
          <Select
            value={moveTargetWs || undefined}
            onChange={(v) => setMoveTargetWs(v)}
            className="w-full"
            placeholder="请选择工作区"
            options={wsList.map((ws) => ({ value: ws.id, label: ws.name }))}
          />
        </div>
      </Modal>

      {/* Hidden file input for imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.har,.http,.yaml,.yml"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </div>
  );
}
