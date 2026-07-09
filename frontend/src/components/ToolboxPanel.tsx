import { useState } from 'react';
import { Button, message } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  UploadOutlined,
  CodeOutlined,
  RestOutlined,
  FileTextOutlined,
  BoldOutlined,
  GlobalOutlined,
  TableOutlined,
  FontSizeOutlined,
  ClearOutlined,
  LinkOutlined,
  PictureOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

interface ToolResult {
  output: string;
  status: 'success' | 'error';
}

const tools = [
  { id: 'json-format', label: 'JSON格式化', icon: <CodeOutlined />, category: '格式化' },
  { id: 'json-minify', label: 'JSON压缩', icon: <CodeOutlined />, category: '格式化' },
  { id: 'json2csv', label: 'JSON转CSV', icon: <TableOutlined />, category: '转换' },
  { id: 'url-encode', label: 'URL编码', icon: <LinkOutlined />, category: '编码' },
  { id: 'url-decode', label: 'URL解码', icon: <LinkOutlined />, category: '编码' },
  { id: 'base64-encode', label: 'Base64编码', icon: <UploadOutlined />, category: '编码' },
  { id: 'base64-decode', label: 'Base64解码', icon: <DownloadOutlined />, category: '编码' },
  { id: 'base64-image', label: 'Base64图片', icon: <PictureOutlined />, category: '编码' },
  { id: 'md5', label: 'MD5哈希', icon: <BoldOutlined />, category: '哈希' },
  { id: 'sha256', label: 'SHA256哈希', icon: <BoldOutlined />, category: '哈希' },
  { id: 'timestamp', label: '时间戳转换', icon: <RestOutlined />, category: '转换' },
  { id: 'uuid', label: 'UUID生成', icon: <FileTextOutlined />, category: '生成' },
  { id: 'ip-info', label: 'IP查询', icon: <GlobalOutlined />, category: '查询' },
  { id: 'case-upper', label: '转大写', icon: <FontSizeOutlined />, category: '文本' },
  { id: 'case-lower', label: '转小写', icon: <FontSizeOutlined />, category: '文本' },
  { id: 'case-camel', label: '驼峰命名', icon: <FontSizeOutlined />, category: '文本' },
  { id: 'trim', label: '去除空格', icon: <ClearOutlined />, category: '文本' },
  { id: 'url-parse', label: 'URL解析', icon: <LinkOutlined />, category: '解析' },
  { id: 'markdown', label: 'Markdown编辑器', icon: <EyeOutlined />, category: '文本' },
];

const categories = ['格式化', '转换', '编码', '哈希', '生成', '查询', '文本', '解析'];

function md5(input: string): string {
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476;
  const bytes = new TextEncoder().encode(input);
  const bits = bytes.length * 8;
  
  const padding = new Uint8Array((56 - (bytes.length % 64) + 64) % 64);
  padding[0] = 0x80;
  
  const lengthArray = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    lengthArray[7 - i] = bits >>> (8 * i);
  }
  
  const padded = new Uint8Array(bytes.length + padding.length + 8);
  padded.set(bytes);
  padded.set(padding, bytes.length);
  padded.set(lengthArray, bytes.length + padding.length);
  
  for (let i = 0; i < padded.length; i += 64) {
    const chunk = padded.subarray(i, i + 64);
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = (chunk[j * 4] << 24) | (chunk[j * 4 + 1] << 16) | (chunk[j * 4 + 2] << 8) | chunk[j * 4 + 3];
    }
    
    let [a, b, c, d] = [h0, h1, h2, h3];
    const s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
               5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
               4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
               6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    const K = new Uint32Array(64);
    for (let j = 0; j < 64; j++) {
      K[j] = Math.floor(4294967296 * Math.abs(Math.sin(j + 1)));
    }
    
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      b = b + ((a + f + K[j] + M[g]) << s[j] | (a + f + K[j] + M[g]) >>> (32 - s[j]));
      a = temp;
    }
    
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
  }
  
  const result = [h0, h1, h2, h3];
  return result.map(v => v.toString(16).padStart(8, '0')).join('');
}

function sha256(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
             0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
             0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
             0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
             0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
             0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
             0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
             0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  
  const padding = new Uint8Array((64 - (bytes.length % 64) + 64) % 64);
  padding[0] = 0x80;
  const lengthArray = new Uint8Array(8);
  const bits = BigInt(bytes.length) * 8n;
  for (let i = 0; i < 8; i++) {
    lengthArray[7 - i] = Number((bits >> (BigInt(i) * 8n)) & 0xffn);
  }
  
  const padded = new Uint8Array(bytes.length + padding.length + 8);
  padded.set(bytes);
  padded.set(padding, bytes.length);
  padded.set(lengthArray, bytes.length + padding.length);
  
  for (let i = 0; i < padded.length; i += 64) {
    const chunk = padded.subarray(i, i + 64);
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) {
      w[j] = (chunk[j * 4] << 24) | (chunk[j * 4 + 1] << 16) | (chunk[j * 4 + 2] << 8) | chunk[j * 4 + 3];
    }
    for (let j = 16; j < 64; j++) {
      const s0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
      const s1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    
    let [a, b, c, d, e, f, g, hh] = h;
    for (let j = 0; j < 64; j++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + k[j] + w[j]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  
  return h.map(v => v.toString(16).padStart(8, '0')).join('');
}

function jsonToCsv(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  if (!Array.isArray(data)) {
    throw new Error('输入必须是JSON数组');
  }
  if (data.length === 0) {
    return '';
  }
  
  const headers = [...new Set(data.flatMap(item => Object.keys(item)))];
  const csv = [headers.join(','), ...data.map(row => headers.map(h => {
    const val = row[h];
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(','))].join('\n');
  
  return csv;
}

function camelCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase()).replace(/\s(.)/g, (_, c) => c.toUpperCase());
}

function parseUrl(url: string): string {
  const urlObj = new URL(url);
  const result: Record<string, string> = {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port || '(默认)',
    pathname: urlObj.pathname,
    search: urlObj.search,
    hash: urlObj.hash,
  };
  const params: Record<string, string> = {};
  urlObj.searchParams.forEach((v, k) => params[k] = v);
  result.params = JSON.stringify(params, null, 2);
  return JSON.stringify(result, null, 2);
}

const markdownPreviewStyle = `
.markdown-preview h1 { font-size: 2em; font-weight: 700; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; margin: 0.8em 0 0.5em; }
.markdown-preview h2 { font-size: 1.5em; font-weight: 600; border-bottom: 1px solid #eee; padding-bottom: 0.3em; margin: 0.8em 0 0.5em; }
.markdown-preview h3 { font-size: 1.25em; font-weight: 600; margin: 0.8em 0 0.5em; }
.markdown-preview h4 { font-size: 1em; font-weight: 600; margin: 0.8em 0 0.5em; }
.markdown-preview p { margin: 0.5em 0; line-height: 1.6; }
.markdown-preview ul, .markdown-preview ol { padding-left: 2em; margin: 0.5em 0; }
.markdown-preview li { margin: 0.25em 0; }
.markdown-preview code { background: #f0f0f0; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.markdown-preview pre { background: #1e1e1e; color: #d4d4d4; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 0.5em 0; }
.markdown-preview pre code { background: transparent; padding: 0; color: inherit; }
.markdown-preview blockquote { border-left: 4px solid #ddd; margin: 0.5em 0; padding: 0.5em 1em; color: #666; background: #f9f9f9; }
.markdown-preview a { color: #1677ff; text-decoration: none; }
.markdown-preview a:hover { text-decoration: underline; }
.markdown-preview hr { border: none; border-top: 1px solid #ddd; margin: 1em 0; }
.markdown-preview table { border-collapse: collapse; margin: 0.5em 0; width: 100%; }
.markdown-preview th, .markdown-preview td { border: 1px solid #ddd; padding: 0.4em 0.8em; }
.markdown-preview th { background: #f5f5f5; font-weight: 600; }
.markdown-preview img { max-width: 100%; }
.markdown-preview strong { font-weight: 700; }
.markdown-preview em { font-style: italic; }
`;

export default function ToolboxPanel() {
  const [activeTool, setActiveTool] = useState('json-format');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ToolResult | null>(null);

  const handleExecute = () => {
    try {
      let output = '';
      switch (activeTool) {
        case 'json-format':
          output = JSON.stringify(JSON.parse(input), null, 2);
          break;
        case 'json-minify':
          output = JSON.stringify(JSON.parse(input));
          break;
        case 'json2csv':
          output = jsonToCsv(input);
          break;
        case 'url-encode':
          output = encodeURIComponent(input);
          break;
        case 'url-decode':
          output = decodeURIComponent(input);
          break;
        case 'base64-encode':
          output = btoa(unescape(encodeURIComponent(input)));
          break;
        case 'base64-decode':
          output = decodeURIComponent(escape(atob(input)));
          break;
        case 'base64-image':
          output = `data:image/png;base64,${input.substring(0, 100)}...`;
          break;
        case 'md5':
          output = md5(input);
          break;
        case 'sha256':
          output = sha256(input);
          break;
        case 'timestamp':
          const ts = parseInt(input);
          if (!isNaN(ts)) {
            output = new Date(ts).toLocaleString();
          } else {
            output = new Date(input).getTime().toString();
          }
          break;
        case 'uuid':
          output = Array.from({ length: 36 }, () => {
            const chars = '0123456789abcdef';
            return chars[Math.floor(Math.random() * 16)];
          })
            .map((c, i) => (i === 8 || i === 13 || i === 18 || i === 23 ? '-' : c))
            .join('');
          break;
        case 'ip-info':
          try {
            const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
            const match = input.match(ipRegex);
            if (match) {
              output = `IP地址: ${match[1]}\n版本: IPv4\n格式: 点分十进制\n范围: ${match[1].split('.')[0]}.*.*.*`;
            } else {
              output = '未检测到有效IP地址';
            }
          } catch {
            output = 'IP解析失败';
          }
          break;
        case 'case-upper':
          output = input.toUpperCase();
          break;
        case 'case-lower':
          output = input.toLowerCase();
          break;
        case 'case-camel':
          output = camelCase(input);
          break;
        case 'trim':
          output = input.trim();
          break;
        case 'url-parse':
          output = parseUrl(input);
          break;
        default:
          output = input;
      }
      setResult({ output, status: 'success' });
    } catch (e) {
      setResult({ output: (e as Error).message, status: 'error' });
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.output);
      message.success('已复制到剪贴板');
    }
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
  };

  const placeholderMap: Record<string, string> = {
    'json-format': '{"name":"test","value":123}',
    'json-minify': '{"name":"test","value":123}',
    'json2csv': '[{"name":"张三","age":25},{"name":"李四","age":30}]',
    'url-encode': 'https://example.com?name=测试&age=18',
    'url-decode': 'https%3A%2F%2Fexample.com%3Fname%3D%E6%B5%8B%E8%AF%95%26age%3D18',
    'base64-encode': 'Hello World',
    'base64-decode': 'SGVsbG8gV29ybGQ=',
    'base64-image': '粘贴base64图片数据',
    'md5': 'hello world',
    'sha256': 'hello world',
    'timestamp': '1609459200000 或 2024-01-01 00:00:00',
    'uuid': '',
    'ip-info': '192.168.1.100',
    'case-upper': 'hello world',
    'case-lower': 'HELLO WORLD',
    'case-camel': 'hello-world-test',
    'trim': '  hello world  ',
    'url-parse': 'https://example.com:8080/api/users?id=123#top',
  };

  const getCategoryTools = (category: string) => tools.filter(t => t.category === category);

  return (
    <div className="flex h-full bg-white">
      <style>{markdownPreviewStyle}</style>
      <div className="w-[180px] border-r border-gray-200 shrink-0">
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">工具列表</h3>
        </div>
        <div className="p-2 overflow-auto max-h-full">
          {categories.map(category => (
            <div key={category} className="mb-2">
              <div className="text-xs text-gray-400 px-3 py-1">{category}</div>
              {getCategoryTools(category).map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id);
                    setInput('');
                    setResult(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                    activeTool === tool.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {tool.icon}
                  {tool.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            {tools.find((t) => t.id === activeTool)?.label}
          </h2>
          <div className="flex items-center gap-2">
            <Button size="small" onClick={handleClear}>
              清空
            </Button>
            {result && (
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
                复制结果
              </Button>
            )}
            <Button size="small" type="primary" onClick={handleExecute}>
              执行
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {activeTool === 'markdown' ? (
            <div className="flex-1 flex gap-4">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">编辑</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={'# 标题\n\n**粗体** 和 *斜体*\n\n- 列表项1\n- 列表项2\n\n```javascript\nconsole.log("代码");\n```'}
                  className="w-full h-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none"
                />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">预览</div>
                <div className="markdown-preview w-full h-full p-3 border border-gray-300 rounded-lg overflow-auto bg-gray-50">
                  <ReactMarkdown>{input || '*开始输入Markdown...*'}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">输入</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholderMap[activeTool]}
                  className="w-full h-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none"
                />
              </div>

              {result && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">输出</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        result.status === 'success'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {result.status === 'success' ? '成功' : '失败'}
                    </span>
                  </div>
                  <textarea
                    value={result.output}
                    readOnly
                    className="w-full h-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none bg-gray-50"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
