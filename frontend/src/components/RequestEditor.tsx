import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Input, Button, Select, Tabs, Table,
} from 'antd';
import {
  SendOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { HttpRequestItem, HttpHeader, HttpResponseVO } from '../types';
import { METHOD_COLORS, HTTP_METHODS, BODY_TYPES, AUTH_TYPES } from '../types';
import { requestApi, collectionApi } from '../services/api';
import { message } from 'antd';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

const { TextArea } = Input;

interface KvRow extends HttpHeader {
  id: number;
}

let kvIdCounter = 0;
function nextKvId() {
  return ++kvIdCounter;
}

function toKvRows(headers: HttpHeader[]): KvRow[] {
  return headers.map((h) => ({ ...h, id: nextKvId() }));
}

function fromKvRows(rows: KvRow[]): HttpHeader[] {
  return rows.filter((r) => r.key.trim()).map(({ key, value }) => ({ key, value }));
}

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return '#52c41a';
  if (code >= 300 && code < 400) return '#1677ff';
  if (code >= 400 && code < 500) return '#faad14';
  return '#ff4d4f';
}

function formatBody(body: string, contentType: string): string {
  if (!body) return '';
  if (contentType.includes('json')) {
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
}

function detectLanguage(contentType: string, bodyType: string): string {
  if (contentType.includes('json') || bodyType === 'json') return 'json';
  if (contentType.includes('xml') || bodyType === 'xml') return 'xml';
  if (contentType.includes('html')) return 'xml';
  if (contentType.includes('javascript') || contentType.includes('ecmascript')) return 'javascript';
  if (contentType.includes('css')) return 'css';
  if (contentType.includes('sql')) return 'sql';
  if (contentType.includes('yaml') || contentType.includes('yml')) return 'yaml';
  if (contentType.includes('markdown')) return 'markdown';
  return 'plaintext';
}

function bodySizeStr(body: string): string {
  const bytes = new TextEncoder().encode(body).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Shared style constants for highlight overlay sync
const editorStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '12px',
  tabSize: 2,
  whiteSpace: 'pre',
  overflowWrap: 'normal',
  wordBreak: 'normal',
};

interface BodyEditorWithHighlightProps {
  value: string;
  onChange: (v: string) => void;
  language: string;
  placeholder: string;
  variables?: Record<string, string>;
}

function BodyEditorWithHighlight({ value, onChange, language, placeholder, variables = {} }: BodyEditorWithHighlightProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Sync scroll from textarea to pre
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    setTooltip(null);
  };

  // Mouse move to detect hovering over {{variable}}
  const handleMouseMove = (e: React.MouseEvent) => {
    // Hide tooltip when text is selected
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setTooltip(null);
      return;
    }
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const rect = ta.getBoundingClientRect();
    const x = e.clientX - rect.left + ta.scrollLeft;
    const y = e.clientY - rect.top + ta.scrollTop;
    const charWidth = 7.2;
    const lineHeight = 20;
    const padding = 12;
    const col = Math.floor((x - padding) / charWidth);
    const row = Math.floor((y - padding) / lineHeight);
    const lines = value.split('\n');
    if (row < 0 || row >= lines.length) {
      setTooltip(null);
      return;
    }
    const line = lines[row];
    if (col < 0 || col > line.length) {
      setTooltip(null);
      return;
    }
    // Find {{...}} at col in this line
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (col >= match.index && col < match.index + match[0].length) {
        const varName = match[1];
        const varValue = variables[varName];
        const text = varValue !== undefined ? `${varName} = ${varValue}` : `${varName} (未定义)`;
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text });
        return;
      }
    }
    setTooltip(null);
  };

  const handleMouseLeave = () => setTooltip(null);

  // Compute highlighted HTML with variable support
  const highlightedHtml = useMemo(() => {
    if (!value) return '';
    try {
      const highlighted = hljs.highlight(value, { language }).value;
      // Highlight {{variable}} patterns on top of syntax highlighting
      return highlighted.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const colorClass = variables[varName] !== undefined ? 'var-highlight-defined' : 'var-highlight-undefined';
        return `<span class="${colorClass}">${match}</span>`;
      });
    } catch {
      let escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return escaped.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const colorClass = variables[varName] !== undefined ? 'var-highlight-defined' : 'var-highlight-undefined';
        return `<span class="${colorClass}">${match}</span>`;
      });
    }
  }, [value, language, variables]);

  return (
    <div
      className="relative border border-t-0 border-gray-300 rounded-b-lg overflow-hidden"
      style={{ height: 220 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Custom highlight colors */}
      <style>{`
        .body-editor-highlight .hljs-attr { color: #c586c0 !important; }
        .body-editor-highlight .hljs-string { color: #6a9955 !important; }
        .body-editor-highlight .hljs-number { color: #569cd6 !important; }
        .body-editor-highlight .hljs-literal { color: #569cd6 !important; }
        .body-editor-highlight .hljs-variable { color: #9cdcfe !important; }
        .body-editor-highlight .hljs-keyword { color: #c586c0 !important; }
        .body-editor-highlight .hljs-name { color: #c586c0 !important; }
        .body-editor-highlight .hljs-tag { color: #569cd6 !important; }
        .body-editor-highlight .hljs-comment { color: #6a9955 !important; }
        .body-editor-highlight .hljs-title { color: #c586c0 !important; }
        .var-highlight-defined {
          background: linear-gradient(90deg, #d4a72c33, #d4a72c33);
          color: #d4a72c;
          border-radius: 3px;
          padding: 1px 2px;
        }
        .var-highlight-undefined {
          background: linear-gradient(90deg, #f8514933, #f8514933);
          color: #f85149;
          border-radius: 3px;
          padding: 1px 2px;
          text-decoration: line-through;
        }
        .body-var-tooltip {
          position: absolute;
          background: #333;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -100%);
          margin-top: -4px;
        }
      `}</style>
      {/* Tooltip */}
      {tooltip && (
        <div className="body-var-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
      {/* Highlight layer */}
      <pre
        ref={preRef}
        className="absolute inset-0 m-0 pointer-events-none body-editor-highlight"
        style={{
          ...editorStyle,
          overflow: 'hidden',
          margin: 0,
          background: 'transparent',
          color: '#d4d4d4',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml || ' ' }}
        />
      </pre>
      {/* Input layer */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        spellCheck={false}
        className="absolute inset-0 w-full h-full resize-none outline-none"
        style={{
          ...editorStyle,
          color: 'transparent',
          caretColor: '#1677ff',
          backgroundColor: 'transparent',
          border: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}

interface UrlInputWithHighlightProps {
  value: string;
  onChange: (v: string) => void;
  variables?: Record<string, string>;
  placeholder?: string;
  onPressEnter?: () => void;
}

function UrlInputWithHighlight({ value, onChange, variables = {}, placeholder, onPressEnter }: UrlInputWithHighlightProps) {
  const handleInput = (e: React.InputEvent) => {
    const target = e.target as HTMLDivElement;
    onChange(target.innerText || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onPressEnter) {
      e.preventDefault();
      onPressEnter();
    }
  };

  const renderHighlightedContent = () => {
    if (!value) return null;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push(value.slice(lastIndex, match.index));
      }
      const varName = match[1];
      const varValue = variables[varName];
      const isDefined = varValue !== undefined;
      parts.push(
        <span
          key={match.index}
          className={isDefined ? 'var-highlight-defined' : 'var-highlight-undefined'}
          title={isDefined ? `${varName} = ${varValue}` : `${varName} (未定义)`}
        >
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) {
      parts.push(value.slice(lastIndex));
    }
    return parts;
  };

  return (
    <div className="relative flex-1">
      <style>{`
        .var-highlight-defined {
          background: linear-gradient(90deg, #d4a72c33, #d4a72c33);
          color: #d4a72c;
          border-radius: 3px;
          padding: 1px 2px;
        }
        .var-highlight-undefined {
          background: linear-gradient(90deg, #f8514933, #f8514933);
          color: #f85149;
          border-radius: 3px;
          padding: 1px 2px;
          text-decoration: line-through;
        }
        .url-contenteditable {
          width: 100%;
          padding: 5px 11px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          outline: none;
          font-size: 14px;
          line-height: 1.5715;
          white-space: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          min-height: 32px;
        }
        .url-contenteditable:empty:before {
          content: attr(data-placeholder);
          color: #bfbfbf;
          pointer-events: none;
        }
        .url-contenteditable:focus {
          border-color: #40a9ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }
      `}</style>
      <div
        contentEditable
        className="url-contenteditable"
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning={true}
        spellCheck={false}
      >
        {renderHighlightedContent()}
      </div>
    </div>
  );
}

interface RequestEditorProps {
  request: HttpRequestItem | null;
  onRequestChange: (request: HttpRequestItem) => void;
  layoutMode: 'horizontal' | 'vertical';
  variables?: Record<string, string>;
}

export default function RequestEditor({ request, onRequestChange, layoutMode, variables = {} }: RequestEditorProps) {
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<HttpResponseVO | null>(null);
  const [reqTab, setReqTab] = useState('params');
  const [respTab, setRespTab] = useState('body');

  // KV state for each tab
  const [paramsRows, setParamsRows] = useState<KvRow[]>([]);
  const [headersRows, setHeadersRows] = useState<KvRow[]>([]);
  const [formDataRows, setFormDataRows] = useState<KvRow[]>([]);
  const [urlencodedRows, setUrlencodedRows] = useState<KvRow[]>([]);

  const syncFromRequest = useCallback((req: HttpRequestItem) => {
    setParamsRows(toKvRows(req.paramsList));
    setHeadersRows(toKvRows(req.headersList));
    setFormDataRows(toKvRows(req.formDataList));
    setUrlencodedRows(toKvRows(req.urlencodedList));
  }, []);

  // When request prop changes
  const _prevId = useState<string | null>(null);
  if (request && request.id !== _prevId[0]) {
    _prevId[1](request.id);
    syncFromRequest(request);
    setResponse(null);
  }

  const updateRequest = (patch: Partial<HttpRequestItem>) => {
    if (!request) return;
    onRequestChange({ ...request, ...patch });
  };

  // ===== Send =====
  const handleSend = async () => {
    if (!request) return;
    const fullRequest: HttpRequestItem = {
      ...request,
      paramsList: fromKvRows(paramsRows),
      headersList: fromKvRows(headersRows),
      formDataList: fromKvRows(formDataRows),
      urlencodedList: fromKvRows(urlencodedRows),
    };
    setSending(true);
    setResponse(null);
    try {
      const res = await requestApi.send(fullRequest);
      if (res.success && res.data) {
        setResponse(res.data);
        setRespTab('body');
      } else {
        message.error('请求发送失败');
      }
    } catch {
      message.error('请求发送失败');
    } finally {
      setSending(false);
    }
  };

  // ===== Save =====
  const handleSave = async () => {
    if (!request) return;
    const fullRequest: HttpRequestItem = {
      ...request,
      paramsList: fromKvRows(paramsRows),
      headersList: fromKvRows(headersRows),
      formDataList: fromKvRows(formDataRows),
      urlencodedList: fromKvRows(urlencodedRows),
      response: response ? [response] : [],
    };
    try {
      await collectionApi.saveRequest(request.id, fullRequest);
      onRequestChange(fullRequest);
      message.success('保存成功');
    } catch {
      message.error('保存失败');
    }
  };

  // ===== KV table helper =====
  const renderKvTable = (
    rows: KvRow[],
    setRows: (r: KvRow[]) => void,
  ) => {
    const columns = [
      {
        title: 'Key',
        dataIndex: 'key',
        width: '40%',
        render: (_: string, record: KvRow) => (
          <Input
            size="small"
            value={record.key}
            onChange={(e) => {
              const newRows = rows.map((r) => r.id === record.id ? { ...r, key: e.target.value } : r);
              setRows(newRows);
            }}
            placeholder="Key"
          />
        ),
      },
      {
        title: 'Value',
        dataIndex: 'value',
        width: '48%',
        render: (_: string, record: KvRow) => (
          <Input
            size="small"
            value={record.value}
            onChange={(e) => {
              const newRows = rows.map((r) => r.id === record.id ? { ...r, value: e.target.value } : r);
              setRows(newRows);
            }}
            placeholder="Value"
          />
        ),
      },
      {
        title: '',
        dataIndex: 'action',
        width: '12%',
        render: (_: unknown, record: KvRow) => (
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setRows(rows.filter((r) => r.id !== record.id))}
          />
        ),
      },
    ];

    return (
      <div>
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          className="kv-row"
        />
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setRows([...rows, { key: '', value: '', id: nextKvId() }])}
          className="mt-2"
          block
        >
          添加
        </Button>
      </div>
    );
  };

  // ===== Body editor =====
  const renderBodyTab = () => {
    if (!request) return null;
    const contentType = request.headersList.find(h => h.key.toLowerCase() === 'content-type')?.value || '';
    const bodyLanguage = detectLanguage(contentType, request.bodyType);

    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Select
            size="small"
            value={request.bodyType}
            onChange={(v) => updateRequest({ bodyType: v })}
            className="w-48"
            options={BODY_TYPES.map((t) => ({
              value: t,
              label: t === 'none' ? 'none' : t === 'json' ? 'application/json' : t === 'form-data' ? 'multipart/form-data' : t === 'x-www-form-urlencoded' ? 'application/x-www-form-urlencoded' : t === 'text' ? 'text/plain' : t === 'xml' ? 'application/xml' : 'graphql',
            }))}
          />
          {request.bodyType !== 'none' && request.bodyType !== 'form-data' && request.bodyType !== 'x-www-form-urlencoded' && (
            <Button size="small" onClick={() => {
              if (bodyLanguage === 'json') {
                try {
                  const formatted = JSON.stringify(JSON.parse(request.body || '{}'), null, 2);
                  updateRequest({ body: formatted });
                  message.success('JSON已格式化');
                } catch {
                  message.error('JSON格式错误');
                }
              } else if (bodyLanguage === 'xml') {
                try {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(request.body || '', 'text/xml');
                  const ser = new XMLSerializer();
                  updateRequest({ body: ser.serializeToString(doc) });
                  message.success('XML已格式化');
                } catch {
                  message.error('XML格式错误');
                }
              }
            }}>格式化</Button>
          )}
        </div>
        {request.bodyType === 'none' ? (
          <div className="text-gray-400 text-sm p-4">此请求没有请求体</div>
        ) : request.bodyType === 'form-data' ? (
          renderKvTable(formDataRows, setFormDataRows)
        ) : request.bodyType === 'x-www-form-urlencoded' ? (
          renderKvTable(urlencodedRows, setUrlencodedRows)
        ) : (
          <div className="relative">
            <div className="flex items-center justify-between px-3 py-1.5 border border-b-0 border-gray-300 rounded-t-lg bg-gray-50">
              <span className="text-xs text-gray-500">{bodyLanguage.toUpperCase()}</span>
              <Button size="small" icon={<CopyOutlined />} onClick={() => {
                navigator.clipboard.writeText(request.body || '');
                message.success('已复制');
              }}>复制</Button>
            </div>
            <BodyEditorWithHighlight
              value={request.body || ''}
              onChange={(v) => updateRequest({ body: v })}
              language={bodyLanguage}
              placeholder={request.bodyType === 'json' ? '{\n  "key": "value"\n}' : '请输入请求体内容'}
              variables={variables}
            />
          </div>
        )}
      </div>
    );
  };

  // ===== Auth tab =====
  const renderAuthTab = () => {
    if (!request) return null;
    return (
      <div>
        <div className="mb-3">
          <Select
            size="small"
            value={request.authType}
            onChange={(v) => updateRequest({ authType: v })}
            className="w-48"
            options={AUTH_TYPES.map((t) => ({
              value: t,
              label: t === 'none' ? '无认证' : t === 'basic' ? 'Basic Auth' : t === 'bearer' ? 'Bearer Token' : 'API Key',
            }))}
          />
        </div>
        {request.authType === 'basic' && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">用户名</label>
              <Input size="small" value={request.authUsername} onChange={(e) => updateRequest({ authUsername: e.target.value })} placeholder="用户名" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">密码</label>
              <Input.Password size="small" value={request.authPassword} onChange={(e) => updateRequest({ authPassword: e.target.value })} placeholder="密码" />
            </div>
          </div>
        )}
        {request.authType === 'bearer' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Token</label>
            <Input size="small" value={request.authToken} onChange={(e) => updateRequest({ authToken: e.target.value })} placeholder="Bearer Token" />
          </div>
        )}
        {request.authType === 'apikey' && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Key Name</label>
              <Input size="small" value={request.authApiKeyName} onChange={(e) => updateRequest({ authApiKeyName: e.target.value })} placeholder="Key Name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Key Value</label>
              <Input size="small" value={request.authApiKeyValue} onChange={(e) => updateRequest({ authApiKeyValue: e.target.value })} placeholder="Key Value" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">传递方式</label>
              <Select size="small" value={request.authApiKeyPlacement} onChange={(v) => updateRequest({ authApiKeyPlacement: v })} className="w-48" options={[{ value: 'header', label: 'Header' }, { value: 'query', label: 'Query Params' }]} />
            </div>
          </div>
        )}
        {request.authType === 'none' && (
          <div className="text-gray-400 text-sm p-4">此请求没有认证配置</div>
        )}
      </div>
    );
  };

  // ===== Scripts tab =====
  const renderScriptsTab = () => {
    if (!request) return null;
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pre-request 脚本</label>
          <TextArea
            rows={8}
            value={request.prescript}
            onChange={(e) => updateRequest({ prescript: e.target.value })}
            className="font-mono text-xs"
            placeholder="// 在请求发送前执行的脚本"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Test 脚本</label>
          <TextArea
            rows={8}
            value={request.postscript}
            onChange={(e) => updateRequest({ postscript: e.target.value })}
            className="font-mono text-xs"
            placeholder="// 在响应接收后执行的测试脚本"
          />
        </div>
      </div>
    );
  };

  // ===== Variables tab =====
  const renderVariablesTab = () => {
    if (!request) return null;
    const variables = request.variables || [];
    const addVariable = () => {
      updateRequest({
        variables: [...variables, { key: '', value: '', enabled: true }],
      });
    };
    const updateVariable = (index: number, field: string, val: string | boolean) => {
      const newVars = [...variables];
      newVars[index] = { ...newVars[index], [field]: val };
      updateRequest({ variables: newVars });
    };
    const removeVariable = (index: number) => {
      updateRequest({ variables: variables.filter((_, i) => i !== index) });
    };
    return (
      <div className="p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b">
              <th className="w-12 text-left py-1 px-2">启用</th>
              <th className="text-left py-1 px-2">变量名</th>
              <th className="text-left py-1 px-2">变量值</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {variables.map((v, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 px-2">
                  <input
                    type="checkbox"
                    checked={v.enabled}
                    onChange={(e) => updateVariable(i, 'enabled', e.target.checked)}
                  />
                </td>
                <td className="py-1 px-2">
                  <input
                    type="text"
                    value={v.key}
                    onChange={(e) => updateVariable(i, 'key', e.target.value)}
                    placeholder="变量名"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                  />
                </td>
                <td className="py-1 px-2">
                  <input
                    type="text"
                    value={v.value}
                    onChange={(e) => updateVariable(i, 'value', e.target.value)}
                    placeholder="变量值"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                  />
                </td>
                <td className="py-1 px-1">
                  <button
                    onClick={() => removeVariable(i)}
                    className="text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-none"
                  >
                    <DeleteOutlined />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={addVariable}
          className="mt-2"
          block
        >
          添加变量
        </Button>
        <div className="mt-3 text-xs text-gray-400">
          变量格式: {'{{变量名}}'}，在请求URL、Header、Body中引用时将自动替换为对应值
        </div>
      </div>
    );
  };

  // ===== Settings tab =====
  const renderSettingsTab = () => {
    if (!request) return null;
    return (
      <div className="space-y-3 p-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">HTTP 版本</label>
          <Select
            size="small"
            value={request.httpVersion}
            onChange={(v) => updateRequest({ httpVersion: v })}
            className="w-48"
            options={[
              { value: 'HTTP_1_1', label: 'HTTP/1.1' },
              { value: 'HTTP_2', label: 'HTTP/2' },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">代理策略</label>
          <Select
            size="small"
            value={request.proxyPolicy}
            onChange={(v) => updateRequest({ proxyPolicy: v })}
            className="w-48"
            options={[
              { value: 'no-proxy', label: '不使用代理' },
              { value: 'system', label: '使用系统代理' },
              { value: 'custom', label: '自定义代理' },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">请求描述</label>
          <TextArea
            rows={3}
            value={request.description}
            onChange={(e) => updateRequest({ description: e.target.value })}
            placeholder="请求描述..."
          />
        </div>
      </div>
    );
  };

  // ===== Response tabs =====
  const renderResponseBody = () => {
    if (!response) return <div className="p-4 text-gray-400 text-sm">暂无响应</div>;
    const formatted = formatBody(response.body, response.contentType);
    const language = detectLanguage(response.contentType, '');
    const highlighted = useMemo(() => {
      if (language === 'plaintext') {
        return formatted;
      }
      try {
        return hljs.highlight(formatted, { language }).value;
      } catch {
        return formatted;
      }
    }, [formatted, language]);

    return (
      <div className="relative h-full">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">{language.toUpperCase()}</span>
          <Button size="small" icon={<CopyOutlined />} onClick={() => {
            navigator.clipboard.writeText(formatted);
            message.success('已复制');
          }}>复制</Button>
        </div>
        <pre className="response-body-pre overflow-auto h-[calc(100%-44px)]">
          {language === 'plaintext' ? formatted : <span dangerouslySetInnerHTML={{ __html: highlighted }} />}
        </pre>
      </div>
    );
  };

  const renderResponseHeaders = () => {
    if (!response) return <div className="p-4 text-gray-400 text-sm">暂无响应</div>;
    return (
      <Table
        dataSource={response.headers.map((h, i) => ({ ...h, _key: i }))}
        columns={[
          { title: 'Key', dataIndex: 'key', width: '40%' },
          { title: 'Value', dataIndex: 'value', width: '60%' },
        ]}
        rowKey="_key"
        size="small"
        pagination={false}
      />
    );
  };

  const renderResponseTests = () => <div className="p-4 text-gray-400 text-sm">暂无测试结果</div>;
  const renderResponseNetworkLog = () => <div className="p-4 text-gray-400 text-sm">暂无网络日志</div>;
  const renderResponseTiming = () => <div className="p-4 text-gray-400 text-sm">暂无时间线数据</div>;

  if (!request) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        请选择一个请求
      </div>
    );
  }

  const requestTabItems = [
    { key: 'params', label: '参数', children: renderKvTable(paramsRows, setParamsRows) },
    { key: 'headers', label: '请求头', children: renderKvTable(headersRows, setHeadersRows) },
    { key: 'body', label: '请求体', children: renderBodyTab() },
    { key: 'variables', label: '变量', children: renderVariablesTab() },
    { key: 'auth', label: '授权', children: renderAuthTab() },
    { key: 'scripts', label: '脚本', children: renderScriptsTab() },
    { key: 'settings', label: '设置', children: renderSettingsTab() },
  ];

  const responseTabItems = [
    { key: 'body', label: '响应体', children: renderResponseBody() },
    { key: 'headers', label: '响应头', children: renderResponseHeaders() },
    { key: 'tests', label: '测试结果', children: renderResponseTests() },
    { key: 'network', label: '网络日志', children: renderResponseNetworkLog() },
    { key: 'timing', label: '时间线', children: renderResponseTiming() },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Request Line */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
        <Select
          value={request.method}
          onChange={(v) => updateRequest({ method: v })}
          className="w-28"
          size="small"
          options={HTTP_METHODS.map((m) => ({
            value: m,
            label: <span style={{ color: METHOD_COLORS[m], fontWeight: 600 }}>{m}</span>,
          }))}
        />
        <UrlInputWithHighlight
          value={request.url}
          onChange={(v) => updateRequest({ url: v })}
          placeholder="请输入请求URL或cURL命令"
          variables={variables}
          onPressEnter={handleSend}
        />
        <Button
          type="primary"
          size="small"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sending}
        >
          发送
        </Button>
        <Button
          size="small"
          icon={<SaveOutlined />}
          onClick={handleSave}
        >
          保存
        </Button>
      </div>

      {/* Request and Response Area */}
      <div className={`flex-1 overflow-hidden ${layoutMode === 'horizontal' ? 'flex' : 'flex flex-col'}`}>
        {/* Request Section */}
        <div className={`flex flex-col ${layoutMode === 'horizontal' ? 'w-1/2 border-r border-gray-200' : ''}`}>
          {/* Request Tabs */}
          <div className="flex-1 overflow-auto request-tabs">
            <Tabs
              activeKey={reqTab}
              onChange={setReqTab}
              items={requestTabItems}
              size="small"
              className="px-3"
            />
          </div>
        </div>

        {/* Response Section */}
        <div className={`flex flex-col ${layoutMode === 'horizontal' ? 'w-1/2' : ''}`}>
          {/* Status bar */}
          {response && (
            <div className="flex items-center gap-4 px-3 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0 text-xs">
              <span style={{ color: statusColor(response.statusCode), fontWeight: 700 }}>
                {response.statusCode}
              </span>
              <span className="text-gray-500">{response.durationMs} ms</span>
              <span className="text-gray-500">{bodySizeStr(response.body)}</span>
              <span className="text-gray-500 truncate">{response.contentType}</span>
            </div>
          )}

          {/* Response Tabs */}
          <div className="flex-1 overflow-auto">
            <Tabs
              activeKey={respTab}
              onChange={setRespTab}
              items={responseTabItems}
              size="small"
              className="px-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
