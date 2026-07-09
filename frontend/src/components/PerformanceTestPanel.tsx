import { useState } from 'react';
import { Button, Select, Card, Tag, Progress, Statistic, message } from 'antd';
import { PlayCircleOutlined, StopOutlined, LineChartOutlined } from '@ant-design/icons';

interface PerformanceResult {
  label: string;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p99: number;
  tps: number;
  successRate: number;
}

export default function PerformanceTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState({
    concurrency: 10,
    duration: 60,
    rampUp: 5,
    requestType: 'get',
    url: '',
  });
  const [result, setResult] = useState<PerformanceResult | null>(null);

  const handleRun = () => {
    if (!config.url.trim()) {
      alert('请输入请求URL');
      return;
    }
    setIsRunning(true);
    setResult(null);

    setTimeout(() => {
      setResult({
        label: '压测结果',
        min: Math.floor(Math.random() * 50) + 10,
        max: Math.floor(Math.random() * 200) + 100,
        avg: Math.floor(Math.random() * 80) + 50,
        p50: Math.floor(Math.random() * 60) + 40,
        p90: Math.floor(Math.random() * 100) + 80,
        p99: Math.floor(Math.random() * 150) + 120,
        tps: Math.floor(Math.random() * 500) + 100,
        successRate: 95 + Math.random() * 5,
      });
      setIsRunning(false);
    }, 3000);
  };

  const handleStop = () => {
    setIsRunning(false);
    message.info('压测已停止');
  };

  const metrics = result ? [
    { label: '最小响应时间', value: `${result.min} ms`, color: '#52c41a' },
    { label: '最大响应时间', value: `${result.max} ms`, color: '#ff4d4f' },
    { label: '平均响应时间', value: `${result.avg} ms`, color: '#1677ff' },
    { label: 'TPS', value: result.tps.toString(), color: '#722ed1' },
  ] : [];

  const percentileMetrics = result ? [
    { label: 'P50', value: `${result.p50} ms` },
    { label: 'P90', value: `${result.p90} ms` },
    { label: 'P99', value: `${result.p99} ms` },
  ] : [];

  return (
    <div className="flex h-full bg-white p-4">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">性能测试</h2>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button danger icon={<StopOutlined />} onClick={handleStop}>
                停止压测
              </Button>
            ) : (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRun}>
                开始压测
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card bordered={false}>
            <div className="text-xs text-gray-500 mb-1">并发数</div>
            <NumberInput
              min={1}
              max={1000}
              value={config.concurrency}
              onChange={(v) => setConfig({ ...config, concurrency: v || 10 })}
              className="w-full"
              size="large"
            />
          </Card>
          <Card bordered={false}>
            <div className="text-xs text-gray-500 mb-1">持续时间(秒)</div>
            <NumberInput
              min={1}
              max={3600}
              value={config.duration}
              onChange={(v) => setConfig({ ...config, duration: v || 60 })}
              className="w-full"
              size="large"
            />
          </Card>
          <Card bordered={false}>
            <div className="text-xs text-gray-500 mb-1">预热时间(秒)</div>
            <NumberInput
              min={0}
              max={600}
              value={config.rampUp}
              onChange={(v) => setConfig({ ...config, rampUp: v || 5 })}
              className="w-full"
              size="large"
            />
          </Card>
          <Card bordered={false}>
            <div className="text-xs text-gray-500 mb-1">请求方法</div>
            <Select
              value={config.requestType}
              onChange={(v) => setConfig({ ...config, requestType: v })}
              className="w-full"
              size="large"
              options={[
                { value: 'get', label: 'GET' },
                { value: 'post', label: 'POST' },
                { value: 'put', label: 'PUT' },
                { value: 'delete', label: 'DELETE' },
              ]}
            />
          </Card>
        </div>

        <Card bordered={false}>
          <div className="flex items-center gap-2">
            <LineChartOutlined className="text-gray-500" />
            <span className="text-sm text-gray-600">请求URL</span>
          </div>
          <TextInput
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="请输入要压测的URL"
            size="large"
            className="mt-2"
          />
        </Card>

        {isRunning && (
          <Card bordered={false}>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-blue-600">正在执行性能测试...</p>
              </div>
            </div>
          </Card>
        )}

        {result && !isRunning && (
          <>
            <div className="grid grid-cols-4 gap-4">
              {metrics.map((m) => (
                <Card key={m.label} bordered={false}>
                  <Statistic title={m.label} value={m.value} valueStyle={{ color: m.color }} />
                </Card>
              ))}
            </div>

            <Card bordered={false}>
              <div className="text-sm text-gray-600 mb-4">百分位数</div>
              <div className="flex items-center gap-8">
                {percentileMetrics.map((m) => (
                  <div key={m.label} className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{m.label}</span>
                      <span className="text-sm font-medium">{m.value}</span>
                    </div>
                    <Progress
                      percent={Math.min((parseInt(m.value) / result.max) * 100, 100)}
                      showInfo={false}
                      strokeColor={
                        m.label === 'P50' ? '#52c41a' :
                        m.label === 'P90' ? '#1677ff' : '#ff4d4f'
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card bordered={false}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">成功率</span>
                <Tag color={result.successRate >= 99 ? 'green' : 'orange'}>
                  {result.successRate.toFixed(2)}%
                </Tag>
              </div>
              <Progress
                percent={result.successRate}
                strokeColor={result.successRate >= 99 ? '#52c41a' : '#faad14'}
                className="mt-2"
              />
            </Card>
          </>
        )}

        {!result && !isRunning && (
          <Card bordered={false} className="flex-1">
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <LineChartOutlined className="text-4xl mb-2" />
                <p>配置压测参数后点击"开始压测"</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function NumberInput(props: { min: number; max: number; value: number; onChange: (v: number | null) => void; className: string; size: string }) {
  return (
    <input
      type="number"
      min={props.min}
      max={props.max}
      value={props.value}
      onChange={(e) => props.onChange(parseInt(e.target.value) || null)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-medium ${props.className}`}
    />
  );
}

function TextInput(props: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; size: string; className: string }) {
  return (
    <input
      type="text"
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-base ${props.className}`}
    />
  );
}