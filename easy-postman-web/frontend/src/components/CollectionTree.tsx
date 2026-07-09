import { useState, useEffect } from 'react';
import { Tree, Button, Dropdown, message, Spin } from 'antd';
import {
  FolderOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { CollectionNode } from '../types';
import { collectionApi } from '../services/api';

interface CollectionTreeProps {
  onSelectNode: (node: CollectionNode) => void;
  selectedNodeId: string | undefined;
}

interface TreeNodeData {
  title: React.ReactNode;
  key: string;
  icon?: React.ReactNode;
  children?: TreeNodeData[];
  node?: CollectionNode;
}

export default function CollectionTree({ onSelectNode, selectedNodeId }: CollectionTreeProps) {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await collectionApi.getTree();
      if (res.success && res.data) {
        setTreeData(transformNodes(res.data));
      }
    } catch (e) {
      message.error('加载集合失败');
    } finally {
      setLoading(false);
    }
  };

  const transformNodes = (nodes: CollectionNode[]): TreeNodeData[] => {
    return nodes.map(node => ({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'edit',
                  icon: <EditOutlined />,
                  label: '重命名',
                  onClick: () => handleEdit(node),
                },
                {
                  key: 'addRequest',
                  label: '添加请求',
                  onClick: () => handleAddRequest(node),
                },
                {
                  key: 'addFolder',
                  label: '添加子文件夹',
                  onClick: () => handleAddFolder(node),
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除',
                  onClick: () => handleDelete(node),
                  danger: true,
                },
              ],
            }}
            placement="bottomRight"
          >
            <span style={{ marginLeft: 4, opacity: 0.5, cursor: 'pointer' }}>⋮</span>
          </Dropdown>
        </div>
      ),
      key: node.id,
      icon: node.type === 'group' ? <FolderOutlined /> : <FileTextOutlined />,
      children: node.children && node.children.length > 0 ? transformNodes(node.children) : undefined,
      node,
    }));
  };

  const handleEdit = async (node: CollectionNode) => {
    const newName = prompt('请输入新名称:', node.name);
    if (!newName || newName === node.name) return;

    try {
      if (node.type === 'group') {
        await collectionApi.updateGroup(node.id, { name: newName });
      } else {
        await collectionApi.updateRequest(node.id, { name: newName });
      }
      message.success('修改成功');
      loadTree();
    } catch (e) {
      message.error('修改失败');
    }
  };

  const handleAddFolder = async (parentNode: CollectionNode) => {
    const name = prompt('请输入文件夹名称:', '新建文件夹');
    if (!name) return;

    try {
      await collectionApi.createGroup(name, '', parentNode.id);
      message.success('创建成功');
      loadTree();
    } catch (e) {
      message.error('创建失败');
    }
  };

  const handleAddRequest = async (parentNode: CollectionNode) => {
    const name = prompt('请输入请求名称:', '新建请求');
    if (!name) return;

    try {
      await collectionApi.createRequest(name, 'GET', '', parentNode.id);
      message.success('创建成功');
      loadTree();
    } catch (e) {
      message.error('创建失败');
    }
  };

  const handleDelete = async (node: CollectionNode) => {
    try {
      await collectionApi.deleteNode(node.id);
      message.success('删除成功');
      loadTree();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleAddRoot = async (type: 'group' | 'request') => {
    const name = prompt(type === 'group' ? '请输入文件夹名称:' : '请输入请求名称:', type === 'group' ? '新建文件夹' : '新建请求');
    if (!name) return;

    try {
      if (type === 'group') {
        await collectionApi.createGroup(name, '');
      } else {
        await collectionApi.createRequest(name, 'GET', '');
      }
      message.success('创建成功');
      loadTree();
    } catch (e) {
      message.error('创建失败');
    }
  };

  const handleSelect = (key: string) => {
    const node = findNode(treeData, key);
    if (node) {
      onSelectNode(node);
    }
  };

  const findNode = (nodes: TreeNodeData[], key: string): CollectionNode | undefined => {
    for (const n of nodes) {
      if (n.key === key && n.node) return n.node;
      if (n.children) {
        const found = findNode(n.children, key);
        if (found) return found;
      }
    }
    return undefined;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => handleAddRoot('group')}>
          新建文件夹
        </Button>
        <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => handleAddRoot('request')}>
          新建请求
        </Button>
      </div>
      {loading ? (
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : (
        <Tree
          treeData={treeData}
          defaultExpandAll
          selectedKeys={selectedNodeId ? [selectedNodeId] : []}
          onSelect={(keys) => {
            if (keys.length > 0) {
              handleSelect(String(keys[0]));
            }
          }}
          onDoubleClick={(_, info) => {
            const key = (info.node as unknown as { key: string }).key;
            if (key) {
              handleSelect(String(key));
            }
          }}
        />
      )}
    </div>
  );
}
