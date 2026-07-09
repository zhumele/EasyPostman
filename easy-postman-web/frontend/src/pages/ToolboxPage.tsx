import { useState } from 'react'
import { List, Card, Empty } from 'antd'
import {
  KeyOutlined,
  ClockCircleOutlined,
  BarcodeOutlined,
  CalculatorOutlined,
  SafetyOutlined,
  FileTextOutlined,
  FormatPainterOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'

const tools = [
  { key: 'uuid', name: 'UUID 生成', icon: <KeyOutlined /> },
  { key: 'timestamp', name: '时间戳转换', icon: <ClockCircleOutlined /> },
  { key: 'encode', name: '编码/解码', icon: <BarcodeOutlined /> },
  { key: 'hash', name: '哈希计算', icon: <CalculatorOutlined /> },
  { key: 'encrypt', name: '加密/解密', icon: <SafetyOutlined /> },
  { key: 'json', name: 'JSON 工具', icon: <FileTextOutlined /> },
  { key: 'sql', name: 'SQL 工具', icon: <DatabaseOutlined /> },
  { key: 'markdown', name: 'Markdown', icon: <FormatPainterOutlined /> },
  { key: 'cron', name: 'Cron 表达式', icon: <ThunderboltOutlined /> },
]

export default function ToolboxPage() {
  const [activeTool, setActiveTool] = useState<string>('uuid')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 200, borderRight: '1px solid #e8e8e8', background: '#fafafa', overflow: 'auto' }}>
        <List
          dataSource={tools}
          renderItem={(item) => (
            <List.Item
              style={{
                cursor: 'pointer',
                background: activeTool === item.key ? '#e6f4ff' : 'transparent',
                padding: '12px 16px',
              }}
              onClick={() => setActiveTool(item.key)}
            >
              <List.Item.Meta avatar={item.icon} title={item.name} />
            </List.Item>
          )}
        />
      </div>
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        <Card title={tools.find((t) => t.key === activeTool)?.name} bordered={false}>
          <Empty description="开发中..." />
        </Card>
      </div>
    </div>
  )
}
