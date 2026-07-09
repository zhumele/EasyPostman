import { useState, useEffect, useCallback } from 'react';
import { Input, Button, Modal, message, Table } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FolderOutlined, BranchesOutlined } from '@ant-design/icons';
import { workspaceApi, type Workspace } from '../services/api';

interface WorkspaceManagerProps {
  onChange?: () => void;
}

export default function WorkspaceManager({ onChange }: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameWsId, setRenameWsId] = useState('');
  const [renameWsName, setRenameWsName] = useState('');

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await workspaceApi.getAll();
      if (res.success) {
        setWorkspaces(res.data || []);
      }
      const currentRes = await workspaceApi.getCurrent();
      if (currentRes.success) {
        setCurrentWorkspace(currentRes.data);
      }
    } catch {
      message.error('加载工作区失败');
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleAddWs = async () => {
    if (!newWsName.trim()) {
      message.warning('请输入工作区名称');
      return;
    }
    try {
      const res = await workspaceApi.create({
        name: newWsName.trim(),
        type: 'LOCAL',
        path: `data/workspaces/${Date.now()}`,
      });
      if (res.success) {
        message.success('工作区创建成功');
        loadWorkspaces();
        onChange?.();
      }
    } catch {
      message.error('创建工作区失败');
    } finally {
      setAddModalOpen(false);
      setNewWsName('');
    }
  };

  const handleSwitchWs = async (id: string) => {
    try {
      await workspaceApi.switch(id);
      message.success('工作区切换成功');
      loadWorkspaces();
      onChange?.();
    } catch {
      message.error('切换工作区失败');
    }
  };

  const handleRenameWs = async () => {
    if (!renameWsName.trim()) return;
    try {
      await workspaceApi.rename(renameWsId, renameWsName.trim());
      message.success('重命名成功');
      loadWorkspaces();
      onChange?.();
    } catch {
      message.error('重命名失败');
    } finally {
      setRenameModalOpen(false);
    }
  };

  const handleDeleteWs = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此工作区吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await workspaceApi.delete(id);
          message.success('删除成功');
          loadWorkspaces();
          onChange?.();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: Workspace) => (
        <span className="flex items-center gap-2">
          {record.type === 'GIT' ? <BranchesOutlined style={{ color: '#faad14' }} /> : <FolderOutlined />}
          {record.name}
          {currentWorkspace?.id === record.id && (
            <span className="text-xs text-green-600">(当前)</span>
          )}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (type === 'GIT' ? 'Git' : '本地'),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 160,
      render: (_: unknown, record: Workspace) => (
        <span className="text-xs text-gray-500">
          {new Date(record.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Workspace) => (
        <div className="flex items-center gap-2">
          {currentWorkspace?.id !== record.id && (
            <Button size="small" onClick={() => handleSwitchWs(record.id)}>切换</Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setRenameWsId(record.id);
            setRenameWsName(record.name);
            setRenameModalOpen(true);
          }} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteWs(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full bg-white">
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">工作区管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            新建工作区
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Table
            dataSource={workspaces}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            bordered
          />
          {workspaces.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              暂无工作区，点击上方按钮创建
            </div>
          )}
        </div>
      </div>

      <Modal
        title="新建工作区"
        open={addModalOpen}
        onOk={handleAddWs}
        onCancel={() => setAddModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={newWsName}
          onChange={(e) => setNewWsName(e.target.value)}
          onPressEnter={handleAddWs}
          placeholder="请输入工作区名称"
          autoFocus
        />
      </Modal>

      <Modal
        title="重命名工作区"
        open={renameModalOpen}
        onOk={handleRenameWs}
        onCancel={() => setRenameModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={renameWsName}
          onChange={(e) => setRenameWsName(e.target.value)}
          onPressEnter={handleRenameWs}
          autoFocus
        />
      </Modal>
    </div>
  );
}