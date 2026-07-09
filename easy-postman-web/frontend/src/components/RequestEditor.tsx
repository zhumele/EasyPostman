import { useState, useEffect } from 'react';
import { Tabs, Button, Input, Select, Space, InputNumber, Switch, message } from 'antd';
import { SendOutlined, SaveOutlined } from '@ant-design/icons';
import MonacoEditor from '@monaco-editor/react';
import type { HttpRequestItem, HttpHeader, HttpParam, HttpFormData, HttpFormUrlencoded } from '../types';
import { collectionApi, requestApi } from '../services/api';

interface RequestEditorProps {
  request: HttpRequestItem | undefined;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];
const BODY_TYPES = ['raw', 'form-data', 'urlencoded', 'binary'];

export default function RequestEditor({ request }: RequestEditorProps) {
  const [item, setItem] = useState<HttpRequestItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (request) {
      setItem({ ...request });
    } else {
      setItem(null);
    }
  }, [request]);

  if (!item) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        请从左侧选择一个请求进行编辑
      </div>
    );
  }

  const updateField = <K extends keyof HttpRequestItem>(key: K, value: HttpRequestItem[K]) => {
    setItem(prev => prev ? { ...prev, [key]: value } : null);
  };

  const updateHeaders = (index: number, field: keyof HttpHeader, value: string | boolean) => {
    setItem(prev => {
      if (!prev) return prev;
      const headers = [...prev.headersList];
      headers[index] = { ...headers[index], [field]: value };
      return { ...prev, headersList: headers };
    });
  };

  const addHeader = () => {
    setItem(prev => {
      if (!prev) return prev;
      return { ...prev, headersList: [...prev.headersList, { key: '', value: '', enabled: true }] };
    });
  };

  const removeHeader = (index: number) => {
    setItem(prev => {
      if (!prev) return prev;
      const headers = prev.headersList.filter((_, i) => i !== index);
      return { ...prev, headersList: headers };
    });
  };

  const updateParams = (index: number, field: keyof HttpParam, value: string | boolean) => {
    setItem(prev => {
      if (!prev) return prev;
      const params = [...prev.paramsList];
      params[index] = { ...params[index], [field]: value };
      return { ...prev, paramsList: params };
    });
  };

  const addParam = () => {
    setItem(prev => {
      if (!prev) return prev;
      return { ...prev, paramsList: [...prev.paramsList, { key: '', value: '', enabled: true }] };
    });
  };

  const removeParam = (index: number) => {
    setItem(prev => {
      if (!prev) return prev;
      const params = prev.paramsList.filter((_, i) => i !== index);
      return { ...prev, paramsList: params };
    });
  };

  const updateFormData = (index: number, field: keyof HttpFormData, value: string | boolean) => {
    setItem(prev => {
      if (!prev) return prev;
      const data = [...prev.formDataList];
      data[index] = { ...data[index], [field]: value };
      return { ...prev, formDataList: data };
    });
  };

  const addFormData = () => {
    setItem(prev => {
      if (!prev) return prev;
      return { ...prev, formDataList: [...prev.formDataList, { key: '', value: '', type: 'text', enabled: true }] };
    });
  };

  const removeFormData = (index: number) => {
    setItem(prev => {
      if (!prev) return prev;
      const data = prev.formDataList.filter((_, i) => i !== index);
      return { ...prev, formDataList: data };
    });
  };

  const updateUrlencoded = (index: number, field: keyof HttpFormUrlencoded, value: string | boolean) => {
    setItem(prev => {
      if (!prev) return prev;
      const data = [...prev.urlencodedList];
      data[index] = { ...data[index], [field]: value };
      return { ...prev, urlencodedList: data };
    });
  };

  const addUrlencoded = () => {
    setItem(prev => {
      if (!prev) return prev;
      return { ...prev, urlencodedList: [...prev.urlencodedList, { key: '', value: '', enabled: true }] };
    });
  };

  const removeUrlencoded = (index: number) => {
    setItem(prev => {
      if (!prev) return prev;
      const data = prev.urlencodedList.filter((_, i) => i !== index);
      return { ...prev, urlencodedList: data };
    });
  };

  const handleSave = async () => {
    try {
      await collectionApi.updateRequest(item.id, item);
      message.success('保存成功');
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await requestApi.send(item);
      if (res.success) {
        setResponse(JSON.stringify(res.data, null, 2));
        setStatusCode(res.data?.statusCode || null);
        setDuration(res.data?.durationMs || null);
      } else {
        setResponse(res.message || '请求失败');
        setStatusCode(null);
      }
    } catch (e) {
      setResponse('请求失败: ' + (e as Error).message);
      setStatusCode(null);
    } finally {
      setLoading(false);
    }
  };

  const renderHeaderRow = (header: HttpHeader, index: number) => (
    <div key={index} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
      <Switch
        checked={header.enabled ?? true}
        onChange={(v) => updateHeaders(index, 'enabled', v)}
        size="small"
      />
      <Input
        placeholder="Key"
        value={header.key}
        onChange={(e) => updateHeaders(index, 'key', e.target.value)}
        style={{ width: 150 }}
        size="small"
      />
      <Input
        placeholder="Value"
        value={header.value}
        onChange={(e) => updateHeaders(index, 'value', e.target.value)}
        style={{ flex: 1 }}
        size="small"
      />
      <Button type="text" danger size="small" onClick={() => removeHeader(index)}>
        删除
      </Button>
    </div>
  );

  const renderParamRow = (param: HttpParam, index: number) => (
    <div key={index} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
      <Switch
        checked={param.enabled ?? true}
        onChange={(v) => updateParams(index, 'enabled', v)}
        size="small"
      />
      <Input
        placeholder="Key"
        value={param.key}
        onChange={(e) => updateParams(index, 'key', e.target.value)}
        style={{ width: 150 }}
        size="small"
      />
      <Input
        placeholder="Value"
        value={param.value}
        onChange={(e) => updateParams(index, 'value', e.target.value)}
        style={{ flex: 1 }}
        size="small"
      />
      <Button type="text" danger size="small" onClick={() => removeParam(index)}>
        删除
      </Button>
    </div>
  );

  const renderFormDataRow = (data: HttpFormData, index: number) => (
    <div key={index} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
      <Switch
        checked={data.enabled ?? true}
        onChange={(v) => updateFormData(index, 'enabled', v)}
        size="small"
      />
      <Input
        placeholder="Key"
        value={data.key}
        onChange={(e) => updateFormData(index, 'key', e.target.value)}
        style={{ width: 120 }}
        size="small"
      />
      <Select
        value={data.type}
        options={[{ value: 'text', label: 'Text' }, { value: 'file', label: 'File' }]}
        onChange={(v) => updateFormData(index, 'type', v)}
        style={{ width: 100 }}
        size="small"
      />
      <Input
        placeholder="Value"
        value={data.value}
        onChange={(e) => updateFormData(index, 'value', e.target.value)}
        style={{ flex: 1 }}
        size="small"
      />
      <Button type="text" danger size="small" onClick={() => removeFormData(index)}>
        删除
      </Button>
    </div>
  );

  const renderUrlencodedRow = (data: HttpFormUrlencoded, index: number) => (
    <div key={index} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
      <Switch
        checked={data.enabled ?? true}
        onChange={(v) => updateUrlencoded(index, 'enabled', v)}
        size="small"
      />
      <Input
        placeholder="Key"
        value={data.key}
        onChange={(e) => updateUrlencoded(index, 'key', e.target.value)}
        style={{ width: 150 }}
        size="small"
      />
      <Input
        placeholder="Value"
        value={data.value}
        onChange={(e) => updateUrlencoded(index, 'value', e.target.value)}
        style={{ flex: 1 }}
        size="small"
      />
      <Button type="text" danger size="small" onClick={() => removeUrlencoded(index)}>
        删除
      </Button>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Input
          value={item.name}
          onChange={(e) => updateField('name', e.target.value)}
          style={{ fontSize: 16, fontWeight: 600, border: 'none', padding: 0 }}
          placeholder="请求名称"
        />
        <div style={{ flex: 1 }} />
        <Button type="text" icon={<SaveOutlined />} onClick={handleSave}>
          保存
        </Button>
        <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSend}>
          发送
        </Button>
      </div>

      <Tabs defaultActiveKey="request" style={{ flex: 1, overflow: 'hidden' }}>
        <Tabs.TabPane tab="请求" key="request">
          <div style={{ padding: 16, overflow: 'auto', height: 'calc(100% - 40px)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Select
                value={item.method}
                options={HTTP_METHODS.map(m => ({ value: m, label: m }))}
                onChange={(v) => updateField('method', v)}
                style={{ width: 120 }}
              />
              <Input
                value={item.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="URL"
                style={{ flex: 1 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Headers</span>
                <Button type="text" size="small" onClick={addHeader}>添加</Button>
              </div>
              {item.headersList.map((h, i) => renderHeaderRow(h, i))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Query Parameters</span>
                <Button type="text" size="small" onClick={addParam}>添加</Button>
              </div>
              {item.paramsList.map((p, i) => renderParamRow(p, i))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Body</span>
                <Select
                  value={item.bodyType}
                  options={BODY_TYPES.map(t => ({ value: t, label: t }))}
                  onChange={(v) => updateField('bodyType', v)}
                  size="small"
                />
              </div>

              {item.bodyType === 'raw' && (
                <MonacoEditor
                  height="300px"
                  language="json"
                  theme="vs-dark"
                  value={item.body}
                  onChange={(v) => updateField('body', v || '')}
                />
              )}

              {item.bodyType === 'form-data' && (
                <div>
                  {item.formDataList.map((d, i) => renderFormDataRow(d, i))}
                  <Button type="text" size="small" onClick={addFormData}>添加</Button>
                </div>
              )}

              {item.bodyType === 'urlencoded' && (
                <div>
                  {item.urlencodedList.map((d, i) => renderUrlencodedRow(d, i))}
                  <Button type="text" size="small" onClick={addUrlencoded}>添加</Button>
                </div>
              )}

              {item.bodyType === 'binary' && (
                <div style={{ padding: 16, border: '1px dashed #d9d9d9', borderRadius: 4, textAlign: 'center', color: '#999' }}>
                  请选择文件
                </div>
              )}
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab="响应" key="response">
          <div style={{ padding: 16, overflow: 'auto', height: 'calc(100% - 40px)' }}>
            {statusCode !== null && (
              <div style={{ marginBottom: 8, display: 'flex', gap: 16 }}>
                <span style={{ color: statusCode >= 200 && statusCode < 300 ? '#52c41a' : '#ff4d4f' }}>
                  Status: {statusCode}
                </span>
                {duration !== null && <span>Duration: {duration}ms</span>}
              </div>
            )}
            <MonacoEditor
              height="calc(100% - 40px)"
              language="json"
              theme="vs-dark"
              value={response}
              options={{ readOnly: true }}
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab="前置脚本" key="prescript">
          <div style={{ padding: 16, height: 'calc(100% - 40px)' }}>
            <MonacoEditor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={item.prescript}
              onChange={(v) => updateField('prescript', v || '')}
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab="后置脚本" key="postscript">
          <div style={{ padding: 16, height: 'calc(100% - 40px)' }}>
            <MonacoEditor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={item.postscript}
              onChange={(v) => updateField('postscript', v || '')}
            />
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
