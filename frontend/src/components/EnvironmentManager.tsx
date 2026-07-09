import { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Button, Table, Switch, Modal, Dropdown, message, Badge, Select } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { environmentApi, workspaceApi } from '../services/api';
import type { Environment, Variable } from '../types';

let varIdCounter = 0;
function nextVarId() { return ++varIdCounter; }

interface VarRow extends Variable {
  _id: number;
}

function toVarRows(vars: Variable[]): VarRow[] {
  return vars.map((v) => ({ ...v, _id: nextVarId() }));
}

function fromVarRows(rows: VarRow[]): Variable[] {
  return rows.map(({ key, value, enabled }) => ({ key, value, enabled }));
}

export default function EnvironmentManager() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [varRows, setVarRows] = useState<VarRow[]>([]);
  const [searchText, setSearchText] = useState('');
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditText, setBulkEditText] = useState('');
  const [addEnvModalOpen, setAddEnvModalOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameEnvId, setRenameEnvId] = useState<string>('');
  const [renameEnvName, setRenameEnvName] = useState('');

  const selectedEnv = environments.find((e) => e.id === selectedEnvId) || null;

  const loadEnvironments = useCallback(async () => {
    try {
      const res = await environmentApi.getAll();
      if (res.success) {
        setEnvironments(res.data || []);
        setActiveEnvId(res.activeId || null);
      }
    } catch {
      message.error('加载环境失败');
    }
  }, []);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  // Sync var rows when selected env changes
  useEffect(() => {
    if (selectedEnv) {
      setVarRows(toVarRows(selectedEnv.variableList));
    } else {
      setVarRows([]);
    }
  }, [selectedEnvId, selectedEnv]);

  const handleAddEnv = async () => {
    if (!newEnvName.trim()) {
      message.warning('请输入环境名称');
      return;
    }
    try {
      const res = await environmentApi.create(newEnvName.trim());
      if (res.success) {
        message.success('环境创建成功');
        loadEnvironments();
        if (res.data) {
          setSelectedEnvId(res.data.id);
        }
      } else {
        message.error('创建环境失败');
      }
    } catch {
      message.error('创建环境失败');
    } finally {
      setAddEnvModalOpen(false);
      setNewEnvName('');
    }
  };

  const handleDeleteEnv = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此环境吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await environmentApi.delete(id);
          message.success('删除成功');
          if (selectedEnvId === id) setSelectedEnvId(null);
          loadEnvironments();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleActivateEnv = async (id: string) => {
    try {
      await environmentApi.activate(id);
      message.success('已激活环境');
      loadEnvironments();
    } catch {
      message.error('激活环境失败');
    }
  };

  const handleSaveEnv = async () => {
    if (!selectedEnv) return;
    const updated: Environment = {
      ...selectedEnv,
      variableList: fromVarRows(varRows),
    };
    try {
      await environmentApi.update(selectedEnv.id, updated);
      message.success('保存成功');
      loadEnvironments();
    } catch {
      message.error('保存失败');
    }
  };

  const handleRenameEnv = async () => {
    if (!renameEnvName.trim()) return;
    const env = environments.find((e) => e.id === renameEnvId);
    if (!env) return;
    try {
      await environmentApi.update(renameEnvId, { ...env, name: renameEnvName.trim() });
      message.success('重命名成功');
      loadEnvironments();
    } catch {
      message.error('重命名失败');
    } finally {
      setRenameModalOpen(false);
    }
  };

  const handleDuplicateEnv = async (env: Environment) => {
    try {
      const res = await environmentApi.create(`${env.name} 副本`);
      if (res.success && res.data) {
        await environmentApi.update(res.data.id, { ...res.data, variableList: env.variableList });
        message.success('副本创建成功');
        loadEnvironments();
      }
    } catch {
      message.error('创建副本失败');
    }
  };

  // ===== Bulk edit =====
  const openBulkEdit = () => {
    const text = varRows
      .map((r) => `${r.key}: ${r.value}`)
      .join('\n');
    setBulkEditText(text);
    setBulkEditOpen(true);
  };

  const applyBulkEdit = () => {
    const lines = bulkEditText.split('\n').filter((l) => l.trim());
    const newRows: VarRow[] = lines.map((line) => {
      const idx = line.indexOf(':');
      const key = idx >= 0 ? line.substring(0, idx).trim() : line.trim();
      const value = idx >= 0 ? line.substring(idx + 1).trim() : '';
      return { key, value, enabled: true, _id: nextVarId() };
    });
    setVarRows(newRows);
    setBulkEditOpen(false);
  };

  // ===== Right-click menu =====
  const getContextMenuItems = (_env: Environment) => [
    { key: 'add', label: '新增环境', icon: <PlusOutlined /> },
    { type: 'divider' as const, key: 'd1' },
    { key: 'import-easypostman', label: '从EasyPostman导入' },
    { key: 'import-postman', label: '从Postman导入' },
    { key: 'import-intellij', label: '从IntelliJ IDEA HTTP导入' },
    { type: 'divider' as const, key: 'd2' },
    { key: 'rename', label: '重命名', icon: <EditOutlined /> },
    { key: 'duplicate', label: '创建副本' },
    { key: 'delete', label: '删除', danger: true },
    { type: 'divider' as const, key: 'd3' },
    { key: 'export-postman', label: '导出为Postman' },
    { key: 'move-workspace', label: '转移工作区' },
  ];

  // ===== Import/Export helpers =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState('');

  const handleEnvImportClick = (type: string) => {
    setImportType(type);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleEnvFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let envs: { name: string; variables: Variable[] }[] = [];
      if (importType === 'easypostman') {
        const data = JSON.parse(text);
        envs = Array.isArray(data) ? data : [data];
      } else if (importType === 'postman') {
        const data = JSON.parse(text);
        const pmEnvs = data.values || data.environments || (Array.isArray(data) ? data : [data]);
        envs = pmEnvs.map((env: { name: string; values?: { key: string; value: string; enabled?: boolean }[] }) => ({
          name: env.name || 'Imported',
          variables: (env.values || []).map((v: { key: string; value: string; enabled?: boolean }) => ({
            key: v.key || '',
            value: v.value || '',
            enabled: v.enabled !== false,
          })),
        }));
      } else if (importType === 'intellij') {
        // Parse IntelliJ HTTP Client environment format
        const data = JSON.parse(text);
        for (const [envName, vars] of Object.entries(data)) {
          envs.push({
            name: envName,
            variables: Object.entries(vars as Record<string, string>).map(([k, v]) => ({
              key: k,
              value: v,
              enabled: true,
            })),
          });
        }
      }
      for (const env of envs) {
        await environmentApi.create(env.name);
      }
      message.success(`导入成功，共导入 ${envs.length} 个环境`);
      loadEnvironments();
    } catch (err) {
      message.error('导入失败：' + (err as Error).message);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportEnvAsPostman = (env: Environment) => {
    const postmanEnv = {
      id: env.id,
      name: env.name,
      values: (env.variableList || []).map((v) => ({
        key: v.key,
        value: v.value,
        enabled: v.enabled,
        type: 'any',
      })),
      _postman_variable_scope: 'environment',
    };
    const blob = new Blob([JSON.stringify(postmanEnv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${env.name}.postman_environment.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出Postman环境成功');
  };

  // ===== Move to workspace =====
  const [moveEnvModalOpen, setMoveEnvModalOpen] = useState(false);
  const [_moveEnvId, setMoveEnvId] = useState('');
  const [moveEnvTargetWs, setMoveEnvTargetWs] = useState('');
  const [wsList, setWsList] = useState<{ id: string; name: string }[]>([]);

  const openMoveEnvModal = async (envId: string) => {
    setMoveEnvId(envId);
    setMoveEnvTargetWs('');
    try {
      const res = await workspaceApi.getAll();
      if (res.success) setWsList((res.data || []).map((ws: { id: string; name: string }) => ({ id: ws.id, name: ws.name })));
    } catch { /* */ }
    setMoveEnvModalOpen(true);
  };

  const handleContextMenuClick = (env: Environment, key: string) => {
    if (key === 'add') {
      setNewEnvName('');
      setAddEnvModalOpen(true);
    } else if (key === 'rename') {
      setRenameEnvId(env.id);
      setRenameEnvName(env.name);
      setRenameModalOpen(true);
    } else if (key === 'duplicate') {
      handleDuplicateEnv(env);
    } else if (key === 'delete') {
      handleDeleteEnv(env.id);
    } else if (key === 'import-easypostman') {
      handleEnvImportClick('easypostman');
    } else if (key === 'import-postman') {
      handleEnvImportClick('postman');
    } else if (key === 'import-intellij') {
      handleEnvImportClick('intellij');
    } else if (key === 'export-postman') {
      exportEnvAsPostman(env);
    } else if (key === 'move-workspace') {
      openMoveEnvModal(env.id);
    }
  };

  // New dropdown
  const newMenuItems = [
    { key: 'new', label: '新增环境' },
    { type: 'divider' as const, key: 'd1' },
    { key: 'import-easypostman', label: '从EasyPostman导入' },
    { key: 'import-postman', label: '从Postman导入' },
    { key: 'import-intellij', label: '从IntelliJ IDEA HTTP导入' },
  ];

  const handleNewMenuClick = ({ key }: { key: string }) => {
    if (key === 'new') {
      setNewEnvName('');
      setAddEnvModalOpen(true);
    } else if (key === 'import-easypostman') {
      handleEnvImportClick('easypostman');
    } else if (key === 'import-postman') {
      handleEnvImportClick('postman');
    } else if (key === 'import-intellij') {
      handleEnvImportClick('intellij');
    }
  };

  // Filter environments by search
  const filteredEnvs = environments.filter((e) =>
    e.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // ===== Variable table =====
  const varColumns = [
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 60,
      render: (checked: boolean, record: VarRow) => (
        <Switch
          size="small"
          checked={checked}
          onChange={(v) => {
            setVarRows(varRows.map((r) => r._id === record._id ? { ...r, enabled: v } : r));
          }}
        />
      ),
    },
    {
      title: '变量名',
      dataIndex: 'key',
      width: '38%',
      render: (_: string, record: VarRow) => (
        <Input
          size="small"
          value={record.key}
          onChange={(e) => {
            setVarRows(varRows.map((r) => r._id === record._id ? { ...r, key: e.target.value } : r));
          }}
          placeholder="变量名"
        />
      ),
    },
    {
      title: '变量值',
      dataIndex: 'value',
      width: '38%',
      render: (_: string, record: VarRow) => (
        <Input
          size="small"
          value={record.value}
          onChange={(e) => {
            setVarRows(varRows.map((r) => r._id === record._id ? { ...r, value: e.target.value } : r));
          }}
          placeholder="变量值"
        />
      ),
    },
    {
      title: '',
      dataIndex: 'action',
      width: 50,
      render: (_: unknown, record: VarRow) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setVarRows(varRows.filter((r) => r._id !== record._id))}
        />
      ),
    },
  ];

  return (
    <div className="flex h-full bg-white">
      {/* Left panel: env list */}
      <div className="w-[220px] border-r border-gray-200 flex flex-col shrink-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 shrink-0">
          <Dropdown menu={{ items: newMenuItems, onClick: handleNewMenuClick }} trigger={['click']}>
            <button className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 text-gray-600 cursor-pointer">
              <PlusOutlined />
            </button>
          </Dropdown>
          <Input
            size="small"
            placeholder="搜索环境..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1"
            allowClear
          />
        </div>

        {/* Env list */}
        <div className="flex-1 overflow-auto">
          {filteredEnvs.map((env) => (
            <Dropdown
              key={env.id}
              menu={{
                items: getContextMenuItems(env),
                onClick: ({ key }) => handleContextMenuClick(env, key),
              }}
              trigger={['contextMenu']}
            >
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                  selectedEnvId === env.id ? 'bg-blue-50 text-blue-600' : ''
                }`}
                onClick={() => setSelectedEnvId(env.id)}
                onDoubleClick={() => handleActivateEnv(env.id)}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    activeEnvId === env.id ? 'bg-green-500' : 'border border-gray-300'
                  }`}
                />
                <span className="truncate flex-1">{env.name}</span>
                <Badge
                  count={env.variableList.length}
                  showZero
                  size="small"
                  style={{ backgroundColor: '#e8e8e8', color: '#666', fontSize: 10 }}
                />
              </div>
            </Dropdown>
          ))}
          {environments.length === 0 && (
            <div className="flex items-center justify-center h-24 text-gray-400 text-xs">
              暂无环境，点击 + 创建
            </div>
          )}
        </div>
      </div>

      {/* Right panel: variable editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedEnv ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 shrink-0">
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveEnv}>
                保存
              </Button>
              <Button size="small" icon={<EditOutlined />} onClick={openBulkEdit}>
                批量编辑
              </Button>
              <Input
                size="small"
                placeholder="搜索变量..."
                prefix={<SearchOutlined />}
                className="w-48 ml-auto"
                allowClear
              />
            </div>

            {/* Variable table */}
            <div className="flex-1 overflow-auto p-3">
              <Table
                dataSource={varRows}
                columns={varColumns}
                rowKey="_id"
                size="small"
                pagination={false}
              />
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setVarRows([...varRows, { key: '', value: '', enabled: true, _id: nextVarId() }])}
                className="mt-2"
                block
              >
                添加变量
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            请选择一个环境
          </div>
        )}
      </div>

      {/* Add environment modal */}
      <Modal
        title="新增环境"
        open={addEnvModalOpen}
        onOk={handleAddEnv}
        onCancel={() => setAddEnvModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={newEnvName}
          onChange={(e) => setNewEnvName(e.target.value)}
          onPressEnter={handleAddEnv}
          placeholder="请输入环境名称"
          autoFocus
        />
      </Modal>

      {/* Rename environment modal */}
      <Modal
        title="重命名"
        open={renameModalOpen}
        onOk={handleRenameEnv}
        onCancel={() => setRenameModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={renameEnvName}
          onChange={(e) => setRenameEnvName(e.target.value)}
          onPressEnter={handleRenameEnv}
          autoFocus
        />
      </Modal>

      {/* Bulk edit modal */}
      <Modal
        title="批量编辑"
        open={bulkEditOpen}
        onOk={applyBulkEdit}
        onCancel={() => setBulkEditOpen(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <div className="mb-2 text-xs text-gray-500">每行格式: Key: Value</div>
        <Input.TextArea
          rows={15}
          value={bulkEditText}
          onChange={(e) => setBulkEditText(e.target.value)}
          className="font-mono text-xs"
          placeholder="Key1: Value1&#10;Key2: Value2"
        />
      </Modal>

      {/* Move to Workspace Modal */}
      <Modal
        title="转移到工作区"
        open={moveEnvModalOpen}
        onOk={async () => {
          if (!moveEnvTargetWs) { message.warning('请选择目标工作区'); return; }
          try {
            await workspaceApi.switch(moveEnvTargetWs);
            message.success('已转移到目标工作区');
          } catch {
            message.error('转移失败');
          }
          setMoveEnvModalOpen(false);
        }}
        onCancel={() => setMoveEnvModalOpen(false)}
        okText="转移"
        cancelText="取消"
      >
        <div className="mb-2">
          <label className="block mb-1 text-sm text-gray-600">选择目标工作区</label>
          <Select
            value={moveEnvTargetWs || undefined}
            onChange={(v) => setMoveEnvTargetWs(v)}
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
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleEnvFileImport}
      />
    </div>
  );
}
