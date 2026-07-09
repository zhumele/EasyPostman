import { useState } from 'react';
import { Button, Table, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface VarRow {
  _id: number;
  key: string;
  value: string;
  enabled: boolean;
}

let idCounter = 0;

export default function GlobalVariablePanel() {
  const [rows, setRows] = useState<VarRow[]>([]);

  const columns = [
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 60,
      render: (checked: boolean, record: VarRow) => (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, enabled: e.target.checked } : r))}
        />
      ),
    },
    {
      title: '变量名',
      dataIndex: 'key',
      width: '40%',
      render: (_: string, record: VarRow) => (
        <Input
          size="small"
          value={record.key}
          onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, key: e.target.value } : r))}
          placeholder="变量名"
        />
      ),
    },
    {
      title: '变量值',
      dataIndex: 'value',
      width: '40%',
      render: (_: string, record: VarRow) => (
        <Input
          size="small"
          value={record.value}
          onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, value: e.target.value } : r))}
          placeholder="变量值"
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: unknown, record: VarRow) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setRows(rows.filter((r) => r._id !== record._id))}
        />
      ),
    },
  ];

  return (
    <div>
      <Table
        dataSource={rows}
        columns={columns}
        rowKey="_id"
        size="small"
        pagination={false}
      />
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={() => setRows([...rows, { _id: ++idCounter, key: '', value: '', enabled: true }])}
        className="mt-2"
        block
      >
        添加全局变量
      </Button>
    </div>
  );
}
