import { useState, useEffect, useCallback } from 'react';
import { Button, Table, Input, Tag, message, Tabs, Empty } from 'antd';
import {
  DeleteOutlined,
  ClockCircleOutlined,
  RestOutlined,
  CopyOutlined,
  SearchOutlined,
  RightOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import { historyApi, type HistoryItem } from '../services/api';
import { METHOD_COLORS } from '../types';
import hljs from 'highlight.js';

interface HistoryPanelProps {
  reloadTrigger?: number;
}

export default function HistoryPanel({ reloadTrigger }: HistoryPanelProps = {}) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [detailTab, setDetailTab] = useState('request');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await historyApi.getHistory();
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch {
      message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (reloadTrigger === undefined) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTrigger]);

  const handleClearHistory = () => {
    if (!window.confirm('确定要清空所有历史记录吗？')) return;
    historyApi.clear().then(() => {
      message.success('历史记录已清空');
      setHistory([]);
      setSelectedItem(null);
    }).catch(() => {
      message.error('清空失败');
    });
  };

  const handleDeleteItem = (index: number) => {
    const newHistory = [...history];
    newHistory.splice(index, 1);
    setHistory(newHistory);
    if (selectedItem === history[index]) {
      setSelectedItem(null);
    }
    message.success('已删除');
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    message.success('已复制URL');
  };

  const filteredHistory = history.filter((item) =>
    item.url.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: '方法',
      key: 'method',
      width: 80,
      render: (_: unknown, record: HistoryItem) => (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: `${METHOD_COLORS[record.method] || '#8c8c8c'}18`,
            color: METHOD_COLORS[record.method] || '#8c8c8c',
          }}
        >
          {record.method}
        </span>
      ),
    },
    {
      title: 'URL',
      key: 'url',
      ellipsis: true,
      render: (_: unknown, record: HistoryItem) => (
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm">{record.url}</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyUrl(record.url)}
          />
        </div>
      ),
    },
    {
      title: '状态码',
      key: 'responseCode',
      width: 80,
      render: (_: unknown, record: HistoryItem) => (
        <Tag
          color={
            record.responseCode >= 200 && record.responseCode < 300 ? 'green' :
            record.responseCode >= 300 && record.responseCode < 400 ? 'blue' :
            record.responseCode >= 400 && record.responseCode < 500 ? 'orange' : 'red'
          }
        >
          {record.responseCode}
        </Tag>
      ),
    },
    {
      title: '耗时',
      key: 'duration',
      width: 80,
      render: (_: unknown, record: HistoryItem) => (
        <span className="text-xs text-gray-500">
          {record.response?.costMs || '-'} ms
        </span>
      ),
    },
    {
      title: '时间',
      key: 'requestTime',
      width: 160,
      render: (_: unknown, record: HistoryItem) => (
        <span className="text-xs text-gray-500">
          {new Date(record.requestTime).toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, __: HistoryItem, idx: number) => (
        <div className="flex items-center gap-2">
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={() => setSelectedItem(history[idx])}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(idx)}
          />
        </div>
      ),
    },
  ];

  const formatBody = (body: string, contentType: string): string => {
    if (!body) return '';
    if (contentType.includes('json') || body.startsWith('{') || body.startsWith('[')) {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }
    if (contentType.includes('xml')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(body, 'text/xml');
        const ser = new XMLSerializer();
        return ser.serializeToString(doc);
      } catch {
        return body;
      }
    }
    return body;
  };

  const highlightCode = (code: string, lang: string): string => {
    if (lang === 'plaintext') return code;
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch {
      return code;
    }
  };

  const renderRequestBody = () => {
    if (!selectedItem?.request) return null;
    const { request } = selectedItem;
    const headers = request.headers || {};
    const contentType = headers['Content-Type'] || headers['content-type'] || '';
    const formatted = formatBody(request.body, contentType);
    const language = contentType.includes('json') || request.bodyType === 'json' ? 'json' :
                     contentType.includes('xml') || request.bodyType === 'xml' ? 'xml' : 'plaintext';
    const highlighted = highlightCode(formatted, language);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">方法: <strong>{request.method}</strong></span>
          <span className="font-medium">URL: <strong>{request.url}</strong></span>
          {request.httpVersion && <span className="font-medium">HTTP版本: <strong>{request.httpVersion}</strong></span>}
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">请求头</div>
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 font-mono text-xs">
            {Object.entries(headers).length > 0 ? (
              Object.entries(headers).map(([k, v]) => (
                <div key={k}>{k}: {v}</div>
              ))
            ) : (
              <span className="text-gray-400">无请求头</span>
            )}
          </div>
        </div>

        {request.paramsList && request.paramsList.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1">查询参数</div>
            <Table
              dataSource={request.paramsList.filter(p => p.enabled)}
              columns={[
                { title: 'Key', dataIndex: 'key', width: '40%' },
                { title: 'Value', dataIndex: 'value', width: '60%' },
              ]}
              size="small"
              pagination={false}
            />
          </div>
        )}

        {request.body && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">请求体 ({language.toUpperCase()})</span>
              <Button size="small" icon={<CopyOutlined />} onClick={() => {
                navigator.clipboard.writeText(request.body);
                message.success('已复制');
              }}>复制</Button>
            </div>
            <pre className="border border-gray-200 rounded-lg p-3 bg-gray-50 font-mono text-xs overflow-auto max-h-60">
              {language === 'plaintext' ? formatted : <span dangerouslySetInnerHTML={{ __html: highlighted }} />}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderResponseBody = () => {
    if (!selectedItem?.response) return null;
    const { response } = selectedItem;
    const respHeaders = response.headers || {};
    const contentType = respHeaders['Content-Type'] || respHeaders['content-type'] || '';
    const formatted = formatBody(response.body, contentType);
    const language = contentType.includes('json') ? 'json' :
                     contentType.includes('xml') ? 'xml' : 'plaintext';
    const highlighted = highlightCode(formatted, language);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">状态码: <strong style={{ color: response.code >= 200 && response.code < 300 ? '#52c41a' : '#ff4d4f' }}>{response.code}</strong></span>
          <span className="font-medium">耗时: <strong>{response.costMs} ms</strong></span>
          {response.protocol && <span className="font-medium">协议: <strong>{response.protocol}</strong></span>}
          {response.bodySize && <span className="font-medium">响应体大小: <strong>{response.bodySize} B</strong></span>}
          {response.headersSize && <span className="font-medium">响应头大小: <strong>{response.headersSize} B</strong></span>}
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">响应头</div>
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 font-mono text-xs">
            {Object.entries(respHeaders).length > 0 ? (
              Object.entries(respHeaders).map(([k, v]) => (
                <div key={k}>{k}: {v}</div>
              ))
            ) : (
              <span className="text-gray-400">无响应头</span>
            )}
          </div>
        </div>

        {response.body && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">响应体 ({language.toUpperCase()})</span>
              <Button size="small" icon={<CopyOutlined />} onClick={() => {
                navigator.clipboard.writeText(response.body);
                message.success('已复制');
              }}>复制</Button>
            </div>
            <pre className="border border-gray-200 rounded-lg p-3 bg-gray-50 font-mono text-xs overflow-auto max-h-60">
              {language === 'plaintext' ? formatted : <span dangerouslySetInnerHTML={{ __html: highlighted }} />}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderTimeline = () => {
    if (!selectedItem?.response?.httpEventInfo) {
      return <Empty description="暂无时间线数据" />;
    }
    const { httpEventInfo } = selectedItem.response;
    const startTime = httpEventInfo.callStart || selectedItem.requestTime;
    const timelineItems = [
      { label: '排队', start: httpEventInfo.queueStart, end: httpEventInfo.callStart, color: '#8c8c8c' },
      { label: '代理选择', start: httpEventInfo.proxySelectStart, end: httpEventInfo.proxySelectEnd, color: '#1677ff' },
      { label: 'DNS解析', start: httpEventInfo.dnsStart, end: httpEventInfo.dnsEnd, color: '#52c41a' },
      { label: 'TCP连接', start: httpEventInfo.connectStart, end: httpEventInfo.connectEnd, color: '#faad14' },
      { label: 'TLS握手', start: httpEventInfo.secureConnectStart, end: httpEventInfo.secureConnectEnd, color: '#722ed1' },
      { label: '获取连接', start: httpEventInfo.connectionAcquired, end: httpEventInfo.requestHeadersStart, color: '#1890ff' },
      { label: '发送请求头', start: httpEventInfo.requestHeadersStart, end: httpEventInfo.requestHeadersEnd, color: '#2f54eb' },
      { label: '发送请求体', start: httpEventInfo.requestBodyStart, end: httpEventInfo.requestBodyEnd, color: '#391085' },
      { label: '等待响应', start: httpEventInfo.requestBodyEnd, end: httpEventInfo.responseHeadersStart, color: '#fa8c16' },
      { label: '接收响应头', start: httpEventInfo.responseHeadersStart, end: httpEventInfo.responseHeadersEnd, color: '#52c41a' },
      { label: '接收响应体', start: httpEventInfo.responseBodyStart, end: httpEventInfo.responseBodyEnd, color: '#13c2c2' },
      { label: '释放连接', start: httpEventInfo.responseBodyEnd, end: httpEventInfo.connectionReleased, color: '#8c8c8c' },
    ].filter((item): item is { label: string; start: number; end: number; color: string } => 
      item.start !== undefined && item.end !== undefined);

    const maxEnd = Math.max(...timelineItems.map(t => t.end), startTime);
    const totalWidth = 500;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">本地地址</div>
            <div className="font-mono text-xs">{httpEventInfo.localAddress || '-'}</div>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">远程地址</div>
            <div className="font-mono text-xs">{httpEventInfo.remoteAddress || '-'}</div>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">协议</div>
            <div className="font-mono text-xs">{httpEventInfo.protocol || '-'}</div>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">TLS版本</div>
            <div className="font-mono text-xs">{httpEventInfo.tlsVersion || '-'}</div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-3">请求时间线</div>
          <div className="relative" style={{ height: 30 }}>
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 transform -translate-y-1/2" />
            {timelineItems.map((item, idx) => {
              const left = ((item.start - startTime) / (maxEnd - startTime)) * totalWidth;
              const width = ((item.end - item.start) / (maxEnd - startTime)) * totalWidth;
              const duration = item.end - item.start;
              return (
                <div
                  key={idx}
                  className="absolute top-1/2 transform -translate-y-1/2 rounded-sm"
                  style={{ left: `${Math.max(0, left)}px`, width: `${Math.max(2, width)}px`, height: 16, backgroundColor: item.color }}
                  title={`${item.label}: ${duration}ms`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {timelineItems.map((item, idx) => {
              const duration = item.end - item.start;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.label}</span>
                  <span className="text-xs text-gray-400">{duration}ms</span>
                </div>
              );
            })}
          </div>
        </div>

        {httpEventInfo.errorMessage && (
          <div className="p-3 border border-red-200 rounded-lg bg-red-50">
            <div className="text-xs text-red-500">错误信息</div>
            <div className="text-sm text-red-600">{httpEventInfo.errorMessage}</div>
          </div>
        )}
      </div>
    );
  };

  const renderEventInfo = () => {
    if (!selectedItem?.response?.httpEventInfo) {
      return <Empty description="暂无事件数据" />;
    }
    const { httpEventInfo } = selectedItem.response;
    const fields = [
      { label: '队列开始', value: httpEventInfo.queueStart ? new Date(httpEventInfo.queueStart).toISOString() : '-' },
      { label: '调用开始', value: httpEventInfo.callStart ? new Date(httpEventInfo.callStart).toISOString() : '-' },
      { label: 'DNS开始', value: httpEventInfo.dnsStart ? new Date(httpEventInfo.dnsStart).toISOString() : '-' },
      { label: 'DNS结束', value: httpEventInfo.dnsEnd ? new Date(httpEventInfo.dnsEnd).toISOString() : '-' },
      { label: '连接开始', value: httpEventInfo.connectStart ? new Date(httpEventInfo.connectStart).toISOString() : '-' },
      { label: '连接结束', value: httpEventInfo.connectEnd ? new Date(httpEventInfo.connectEnd).toISOString() : '-' },
      { label: 'TLS开始', value: httpEventInfo.secureConnectStart ? new Date(httpEventInfo.secureConnectStart).toISOString() : '-' },
      { label: 'TLS结束', value: httpEventInfo.secureConnectEnd ? new Date(httpEventInfo.secureConnectEnd).toISOString() : '-' },
      { label: '请求头开始', value: httpEventInfo.requestHeadersStart ? new Date(httpEventInfo.requestHeadersStart).toISOString() : '-' },
      { label: '请求头结束', value: httpEventInfo.requestHeadersEnd ? new Date(httpEventInfo.requestHeadersEnd).toISOString() : '-' },
      { label: '请求体开始', value: httpEventInfo.requestBodyStart ? new Date(httpEventInfo.requestBodyStart).toISOString() : '-' },
      { label: '请求体结束', value: httpEventInfo.requestBodyEnd ? new Date(httpEventInfo.requestBodyEnd).toISOString() : '-' },
      { label: '响应头开始', value: httpEventInfo.responseHeadersStart ? new Date(httpEventInfo.responseHeadersStart).toISOString() : '-' },
      { label: '响应头结束', value: httpEventInfo.responseHeadersEnd ? new Date(httpEventInfo.responseHeadersEnd).toISOString() : '-' },
      { label: '响应体开始', value: httpEventInfo.responseBodyStart ? new Date(httpEventInfo.responseBodyStart).toISOString() : '-' },
      { label: '响应体结束', value: httpEventInfo.responseBodyEnd ? new Date(httpEventInfo.responseBodyEnd).toISOString() : '-' },
      { label: '连接释放', value: httpEventInfo.connectionReleased ? new Date(httpEventInfo.connectionReleased).toISOString() : '-' },
      { label: '调用结束', value: httpEventInfo.callEnd ? new Date(httpEventInfo.callEnd).toISOString() : '-' },
    ];

    return (
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field, idx) => (
          <div key={idx} className="p-2 border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">{field.label}</div>
            <div className="text-xs font-mono text-gray-600 truncate">{field.value}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-white">
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        <div className="flex items-center justify-between mb-4 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">历史记录</h2>
            <Button size="small" icon={<RestOutlined />} onClick={loadHistory} loading={loading}>
              刷新
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              size="small"
              placeholder="搜索URL..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-64"
            />
            <Button size="small" danger icon={<DeleteOutlined />} onClick={handleClearHistory}>
              清空
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 pb-4">
          <Table
            dataSource={filteredHistory}
            columns={columns}
            rowKey={(_record, index) => `${index}`}
            size="small"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            loading={loading}
            onRow={(record) => ({
              onClick: () => setSelectedItem(record),
              style: { cursor: 'pointer' },
            })}
          />
          {!loading && filteredHistory.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <ClockCircleOutlined className="text-4xl mb-2" />
                <p>暂无历史记录</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <div className="w-[500px] flex flex-col border-l border-gray-200">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium">请求详情</h3>
            <Button type="text" size="small" icon={<LeftOutlined />} onClick={() => setSelectedItem(null)}>
              返回列表
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <Tabs
              activeKey={detailTab}
              onChange={setDetailTab}
              items={[
                { key: 'request', label: '请求信息', children: renderRequestBody() },
                { key: 'response', label: '响应信息', children: renderResponseBody() },
                { key: 'timeline', label: '时间线', children: renderTimeline() },
                { key: 'events', label: '事件详情', children: renderEventInfo() },
              ]}
              size="small"
            />
          </div>
        </div>
      )}
    </div>
  );
}
