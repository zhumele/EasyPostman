import { useState } from 'react';
import { Button, Table, Input, message, Card, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';

interface TestCase {
  id: string;
  name: string;
  url: string;
  method: string;
  status: 'pass' | 'fail' | 'pending' | 'running';
  result?: string;
  duration?: number;
}

const MOCK_TEST_CASES: TestCase[] = [
  { id: '1', name: '用户登录接口', url: '/api/login', method: 'POST', status: 'pass', result: '断言通过', duration: 120 },
  { id: '2', name: '获取用户列表', url: '/api/users', method: 'GET', status: 'pass', result: '断言通过', duration: 85 },
  { id: '3', name: '创建用户', url: '/api/users', method: 'POST', status: 'fail', result: '状态码断言失败', duration: 156 },
  { id: '4', name: '更新用户信息', url: '/api/users/1', method: 'PUT', status: 'pending' },
];

export default function FunctionalTestPanel() {
  const [testCases, setTestCases] = useState<TestCase[]>(MOCK_TEST_CASES);
  const [newTestCaseName, setNewTestCaseName] = useState('');
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  const handleAddTestCase = () => {
    if (!newTestCaseName.trim()) {
      message.warning('请输入测试用例名称');
      return;
    }
    const newCase: TestCase = {
      id: Date.now().toString(),
      name: newTestCaseName.trim(),
      url: '',
      method: 'GET',
      status: 'pending',
    };
    setTestCases([...testCases, newCase]);
    setNewTestCaseName('');
    message.success('测试用例创建成功');
  };

  const handleDeleteTestCase = (id: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== id));
    message.success('测试用例删除成功');
  };

  const handleRunTest = (id: string) => {
    const testCase = testCases.find((tc) => tc.id === id);
    if (!testCase) return;

    setRunningTests(new Set([...runningTests, id]));
    setTestCases(testCases.map((tc) =>
      tc.id === id ? { ...tc, status: 'running' as const } : tc
    ));

    setTimeout(() => {
      const passed = Math.random() > 0.3;
      setTestCases(testCases.map((tc) =>
        tc.id === id ? {
          ...tc,
          status: passed ? 'pass' : 'fail',
          result: passed ? '断言通过' : '断言失败',
          duration: Math.floor(Math.random() * 200) + 50,
        } : tc
      ));
      setRunningTests(new Set(runningTests).delete(id) ? runningTests : new Set(runningTests));
    }, 1000 + Math.random() * 1000);
  };

  const handleRunAllTests = () => {
    const pendingCases = testCases.filter((tc) => tc.status !== 'running');
    if (pendingCases.length === 0) {
      message.info('没有待执行的测试用例');
      return;
    }

    pendingCases.forEach((tc) => {
      setRunningTests(new Set([...runningTests, tc.id]));
    });
    setTestCases(testCases.map((tc) =>
      tc.status !== 'running' ? { ...tc, status: 'running' as const } : tc
    ));

    setTimeout(() => {
      setTestCases(testCases.map((tc) => {
        if (tc.status !== 'running') return tc;
        const passed = Math.random() > 0.3;
        return {
          ...tc,
          status: passed ? 'pass' : 'fail',
          result: passed ? '断言通过' : '断言失败',
          duration: Math.floor(Math.random() * 200) + 50,
        };
      }));
      setRunningTests(new Set());
    }, 2000);
  };

  const statusColor = (status: TestCase['status']) => {
    switch (status) {
      case 'pass': return '#52c41a';
      case 'fail': return '#ff4d4f';
      case 'running': return '#1677ff';
      default: return '#d9d9d9';
    }
  };

  const statusText = (status: TestCase['status']) => {
    switch (status) {
      case 'pass': return '通过';
      case 'fail': return '失败';
      case 'running': return '运行中';
      default: return '待执行';
    }
  };

  const columns = [
    {
      title: '测试用例',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '请求方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method: string) => (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: {
              GET: '#e6f7ff',
              POST: '#f6ffed',
              PUT: '#fff7e6',
              DELETE: '#fff1f0',
            }[method] || '#f5f5f5',
            color: {
              GET: '#1890ff',
              POST: '#52c41a',
              PUT: '#fa8c16',
              DELETE: '#ff4d4f',
            }[method] || '#8c8c8c',
          }}
        >
          {method}
        </span>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: TestCase) => (
        <Tag color={statusColor(record.status)}>
          {statusText(record.status)}
        </Tag>
      ),
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 120,
      render: (result: string) => (
        <span className="text-xs text-gray-500">{result || '-'}</span>
      ),
    },
    {
      title: '耗时(ms)',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => (
        <span className="text-xs text-gray-500">{duration || '-'}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: TestCase) => (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            type="primary"
            icon={record.status === 'running' ? <StopOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleRunTest(record.id)}
            disabled={runningTests.has(record.id)}
          >
            {record.status === 'running' ? '停止' : '运行'}
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTestCase(record.id)}
          />
        </div>
      ),
    },
  ];

  const passCount = testCases.filter((tc) => tc.status === 'pass').length;
  const failCount = testCases.filter((tc) => tc.status === 'fail').length;
  const pendingCount = testCases.filter((tc) => tc.status === 'pending').length;

  return (
    <div className="flex h-full bg-white p-4">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">功能测试</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                通过: {passCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                失败: {failCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                待执行: {pendingCount}
              </span>
            </div>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunAllTests}>
              运行全部
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Input
            size="small"
            value={newTestCaseName}
            onChange={(e) => setNewTestCaseName(e.target.value)}
            onPressEnter={handleAddTestCase}
            placeholder="请输入测试用例名称"
            className="w-64"
          />
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddTestCase}>
            添加测试用例
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Card bordered={false}>
            <Table
              dataSource={testCases}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}