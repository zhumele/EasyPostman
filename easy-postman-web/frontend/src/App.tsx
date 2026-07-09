import { useState } from 'react'
import { Layout, Button, Dropdown, Select, Tooltip } from 'antd'
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  FolderOpenOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  ToolOutlined,
  HistoryOutlined,
  SettingOutlined,
  ConsoleSqlOutlined,
  GlobalOutlined,
  DownOutlined,
} from '@ant-design/icons'
import CollectionsPage from './pages/CollectionsPage'
import EnvironmentsPage from './pages/EnvironmentsPage'
import WorkspacePage from './pages/WorkspacePage'
import FunctionalPage from './pages/FunctionalPage'
import PerformancePage from './pages/PerformancePage'
import ToolboxPage from './pages/ToolboxPage'
import HistoryPage from './pages/HistoryPage'
import './index.css'

const { Header, Sider, Content } = Layout

type TabKey = 'collections' | 'environments' | 'workspace' | 'functional' | 'performance' | 'toolbox' | 'history'

const sidebarTabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'collections', label: '集合', icon: <AppstoreOutlined /> },
  { key: 'environments', label: '环境', icon: <EnvironmentOutlined /> },
  { key: 'workspace', label: '工作区', icon: <FolderOpenOutlined /> },
  { key: 'functional', label: '功能测试', icon: <ThunderboltOutlined /> },
  { key: 'performance', label: '性能测试', icon: <DashboardOutlined /> },
  { key: 'toolbox', label: '工具箱', icon: <ToolOutlined /> },
  { key: 'history', label: '历史', icon: <HistoryOutlined /> },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('collections')

  const renderContent = () => {
    switch (activeTab) {
      case 'collections':
        return <CollectionsPage />
      case 'environments':
        return <EnvironmentsPage />
      case 'workspace':
        return <WorkspacePage />
      case 'functional':
        return <FunctionalPage />
      case 'performance':
        return <PerformancePage />
      case 'toolbox':
        return <ToolboxPage />
      case 'history':
        return <HistoryPage />
      default:
        return null
    }
  }

  return (
    <Layout className="app-layout" style={{ height: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e8e8e8',
          height: 48,
          lineHeight: '48px',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, color: '#262626', marginRight: 24 }}>
          EasyPostman Web
        </div>

        <Dropdown
          menu={{
            items: [
              { key: 'import', label: '导入 Postman Collection' },
              { key: 'export', label: '导出 Collection' },
              { type: 'divider' },
              { key: 'exit', label: '退出' },
            ],
          }}
        >
          <Button type="text">
            文件 <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>

        <Dropdown
          menu={{
            items: [
              { key: 'proxy', label: '代理设置' },
              { key: 'request', label: '请求默认设置' },
              { key: 'ui', label: 'UI 设置' },
              { key: 'shortcut', label: '快捷键' },
              { key: 'cert', label: '客户端证书' },
            ],
          }}
        >
          <Button type="text">
            设置 <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>

        <div style={{ flex: 1 }} />

        <Select
          defaultValue="default"
          style={{ width: 180 }}
          options={[{ value: 'default', label: '默认工作区' }]}
          suffixIcon={<DownOutlined style={{ fontSize: 10 }} />}
        />

        <Tooltip title="设置">
          <Button type="text" icon={<SettingOutlined />} />
        </Tooltip>
      </Header>

      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Sider
          width={240}
          style={{
            background: '#fff',
            borderRight: '1px solid #e8e8e8',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e8e8e8',
              flexWrap: 'wrap',
              padding: '4px 0',
            }}
          >
            {sidebarTabs.map((tab) => (
              <Tooltip key={tab.key} title={tab.label} placement="right">
                <div
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: '1 0 33%',
                    padding: '10px 0',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: 18,
                    color: activeTab === tab.key ? '#1677ff' : '#8c8c8c',
                    borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.icon}
                </div>
              </Tooltip>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', height: 'calc(100% - 120px)' }}>
            {renderSidebarContent(activeTab)}
          </div>

          <div
            style={{
              borderTop: '1px solid #e8e8e8',
              padding: '8px',
              display: 'flex',
              gap: 4,
              justifyContent: 'space-around',
            }}
          >
            <Tooltip title="控制台">
              <Button type="text" icon={<ConsoleSqlOutlined />} size="small" />
            </Tooltip>
            <Tooltip title="Cookie 管理">
              <Button type="text" icon={<GlobalOutlined />} size="small" />
            </Tooltip>
            <Tooltip title="全局变量">
              <Button type="text" icon={<EnvironmentOutlined />} size="small" />
            </Tooltip>
          </div>
        </Sider>

        <Content
          style={{
            background: '#fff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
}

function renderSidebarContent(tab: TabKey) {
  switch (tab) {
    case 'collections':
      return null;
    case 'environments':
      return <div style={{ padding: 12, color: '#999' }}>环境列表在主区域展示</div>
    case 'history':
      return <div style={{ padding: 12, color: '#999' }}>历史记录在主区域展示</div>
    default:
      return <div style={{ padding: 12, color: '#999' }}>{sidebarLabels[tab]}</div>
  }
}

const sidebarLabels: Record<TabKey, string> = {
  collections: '集合',
  environments: '环境变量',
  workspace: '工作区',
  functional: '功能测试',
  performance: '性能测试',
  toolbox: '工具箱',
  history: '历史记录',
}

export default App
