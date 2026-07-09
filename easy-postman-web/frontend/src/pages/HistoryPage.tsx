import { useState } from 'react'
import { Input, List, Empty, Tag, Space, Button } from 'antd'
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons'

const historyList = [
  { id: '1', method: 'GET', url: 'https://api.example.com/users', name: '获取用户列表', time: '2024-01-15 10:23:45' },
  { id: '2', method: 'POST', url: 'https://api.example.com/login', name: '登录', time: '2024-01-15 10:20:12' },
  { id: '3', method: 'GET', url: 'https://httpbin.org/get', name: 'httpbin get', time: '2024-01-15 09:15:30' },
]

const methodColor: Record<string, string> = {
  GET: 'green',
  POST: 'blue',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
}

export default function HistoryPage() {
  const [searchText, setSearchText] = useState('')

  const filtered = historyList.filter(
    (h) => h.url.includes(searchText) || h.name.includes(searchText)
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">历史记录</div>
        <Space>
          <Input
            placeholder="搜索历史记录"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Button danger icon={<DeleteOutlined />}>
            清空历史
          </Button>
        </Space>
      </div>

      <List
        dataSource={filtered}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button type="link" size="small">
                查看
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Tag color={methodColor[item.method] || 'default'}>{item.method}</Tag>
                  <span>{item.name}</span>
                </Space>
              }
              description={item.url}
            />
            <div style={{ color: '#999', fontSize: 12 }}>{item.time}</div>
          </List.Item>
        )}
      />

      {filtered.length === 0 && <Empty description="暂无历史记录" style={{ padding: 60 }} />}
    </div>
  )
}
