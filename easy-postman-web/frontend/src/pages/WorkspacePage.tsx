import { Card, Button, Space, Tag, Empty } from 'antd'
import { PlusOutlined, BranchesOutlined, SettingOutlined } from '@ant-design/icons'

const workspaces = [
  { id: 'default', name: '默认工作区', path: '~/EasyPostman/workspaces/default', type: 'local', status: 'active' },
  { id: 'project-a', name: '项目A', path: '~/EasyPostman/workspaces/project-a', type: 'git', status: 'inactive' },
]

export default function WorkspacePage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">工作区管理</div>
        <Button type="primary" icon={<PlusOutlined />}>
          新建工作区
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {workspaces.map((ws) => (
          <Card
            key={ws.id}
            hoverable
            actions={[
              <Button type="text" size="small" icon={<BranchesOutlined />}>
                Git
              </Button>,
              <Button type="text" size="small" icon={<SettingOutlined />}>
                设置
              </Button>,
            ]}
          >
            <Card.Meta
              title={
                <Space>
                  {ws.name}
                  {ws.status === 'active' && <Tag color="green">当前</Tag>}
                  <Tag color={ws.type === 'git' ? 'blue' : 'default'}>
                    {ws.type === 'git' ? 'Git' : '本地'}
                  </Tag>
                </Space>
              }
              description={ws.path}
            />
          </Card>
        ))}
      </div>

      {workspaces.length === 0 && <Empty description="暂无工作区" style={{ padding: 60 }} />}
    </div>
  )
}
