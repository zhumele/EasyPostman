import { useState } from 'react';
import { Button, Table, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface CookieRow {
  _id: number;
  domain: string;
  path: string;
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
}

let idCounter = 0;

export default function CookiePanel() {
  const [rows, setRows] = useState<CookieRow[]>([]);

  const columns = [
    {
      title: '域名',
      dataIndex: 'domain',
      width: '20%',
      render: (_: string, record: CookieRow) => (
        <Input size="small" value={record.domain} onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, domain: e.target.value } : r))} placeholder="域名" />
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      width: '12%',
      render: (_: string, record: CookieRow) => (
        <Input size="small" value={record.path} onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, path: e.target.value } : r))} placeholder="/" />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: '20%',
      render: (_: string, record: CookieRow) => (
        <Input size="small" value={record.name} onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, name: e.target.value } : r))} placeholder="Cookie名称" />
      ),
    },
    {
      title: '值',
      dataIndex: 'value',
      width: '28%',
      render: (_: string, record: CookieRow) => (
        <Input size="small" value={record.value} onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, value: e.target.value } : r))} placeholder="Cookie值" />
      ),
    },
    {
      title: 'HttpOnly',
      dataIndex: 'httpOnly',
      width: 65,
      render: (checked: boolean, record: CookieRow) => (
        <input type="checkbox" checked={checked} onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, httpOnly: e.target.checked } : r))} />
      ),
    },
    {
      title: 'Secure',
      dataIndex: 'secure',
      width: 60,
      render: (checked: boolean, record: CookieRow) => (
        <input type="checkbox" checked={checked} onChange={(e) => setRows(rows.map((r) => r._id === record._id ? { ...r, secure: e.target.checked } : r))} />
      ),
    },
    {
      title: '',
      width: 40,
      render: (_: unknown, record: CookieRow) => (
        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => setRows(rows.filter((r) => r._id !== record._id))} />
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
        onClick={() => setRows([...rows, { _id: ++idCounter, domain: '', path: '/', name: '', value: '', httpOnly: false, secure: false }])}
        className="mt-2"
        block
      >
        添加Cookie
      </Button>
    </div>
  );
}
