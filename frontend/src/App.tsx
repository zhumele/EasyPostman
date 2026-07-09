import { useState, useEffect, useCallback } from 'react';
import { Dropdown, Select, Tooltip, Modal, message, ConfigProvider, theme } from 'antd';
import type { MenuProps } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';
import {
  BookOutlined,
  EnvironmentOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  ToolOutlined,
  HistoryOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ColumnWidthOutlined,
  CloudOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import CollectionTree from './components/CollectionTree';
import RequestEditor from './components/RequestEditor';
import EnvironmentManager from './components/EnvironmentManager';
import WorkspaceManager from './components/WorkspaceManager';
import FunctionalTestPanel from './components/FunctionalTestPanel';
import PerformanceTestPanel from './components/PerformanceTestPanel';
import ToolboxPanel from './components/ToolboxPanel';
import HistoryPanel from './components/HistoryPanel';
import GlobalVariablePanel from './components/GlobalVariablePanel';
import CookiePanel from './components/CookiePanel';
import { environmentApi, workspaceApi, type Workspace } from './services/api';
import { collectionApi } from './services/api';
import type { HttpRequestItem, Environment, SidebarTabId } from './types';

const SIDEBAR_TABS: { id: SidebarTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'collection', label: '集合', icon: <BookOutlined /> },
  { id: 'environment', label: '环境', icon: <EnvironmentOutlined /> },
  { id: 'workspace', label: '工作区', icon: <DesktopOutlined /> },
  { id: 'functional-test', label: '功能测试', icon: <ThunderboltOutlined /> },
  { id: 'performance-test', label: '性能测试', icon: <DashboardOutlined /> },
  { id: 'toolbox', label: '工具箱', icon: <ToolOutlined /> },
  { id: 'history', label: '历史记录', icon: <HistoryOutlined /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<SidebarTabId>('collection');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [selectedRequest, setSelectedRequest] = useState<HttpRequestItem | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [lang, setLang] = useState('zh');
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('vertical');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [collectionTreeReloadKey, setCollectionTreeReloadKey] = useState(0);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  // Modal states
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [changelogModalOpen, setChangelogModalOpen] = useState(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [pluginModalOpen, setPluginModalOpen] = useState(false);
  const [globalVarModalOpen, setGlobalVarModalOpen] = useState(false);
  const [cookieModalOpen, setCookieModalOpen] = useState(false);

  // Load environments
  const loadEnvs = useCallback(async () => {
    try {
      const res = await environmentApi.getAll();
      if (res.success) {
        setEnvironments(res.data || []);
        setActiveEnvId(res.activeId || null);
      }
    } catch { /* silently fail */ }
  }, []);

  // Load workspaces
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await workspaceApi.getAll();
      if (res.success) setWorkspaces(res.data || []);
      const cur = await workspaceApi.getCurrent();
      if (cur.success && cur.data) setCurrentWorkspaceId(cur.data.id);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    loadEnvs();
    loadWorkspaces();
  }, [loadEnvs, loadWorkspaces]);

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(500, e.clientX - 50));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // ===== File menu =====
  const handleExportCollections = async () => {
    try {
      const res = await collectionApi.getTree();
      if (res.success) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `easypostman_collections_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('集合导出成功');
      }
    } catch {
      message.error('导出集合失败');
    }
  };

  const handleExportEnvs = async () => {
    try {
      const res = await environmentApi.getAll();
      if (res.success) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `easypostman_environments_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('环境变量导出成功');
      }
    } catch {
      message.error('导出环境变量失败');
    }
  };

  const fileMenuItems: MenuProps['items'] = [
    { key: 'export-collections', label: '导出全部集合' },
    { key: 'export-envs', label: '导出全部环境变量' },
    { type: 'divider', key: 'd1' },
    { key: 'open-log', label: '打开日志目录' },
    { key: 'exit', label: '退出' },
  ];

  const handleFileMenu: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'export-collections') handleExportCollections();
    else if (key === 'export-envs') handleExportEnvs();
    else if (key === 'open-log') {
      Modal.info({ title: '日志目录', content: 'Web版暂不支持直接打开文件目录，日志保存在服务器数据目录中。' });
    }
    else if (key === 'exit') {
      Modal.confirm({
        title: '退出',
        content: '确定要关闭当前页面吗？',
        okText: '确定',
        cancelText: '取消',
        onOk: () => window.close(),
      });
    }
  };

  // ===== Language menu =====
  const langMenuItems: MenuProps['items'] = [
    { key: 'zh', label: '中文', icon: lang === 'zh' ? <CheckOutlined /> : null },
    { key: 'en', label: 'English', icon: lang === 'en' ? <CheckOutlined /> : null },
  ];

  const handleLangMenu: NonNullable<MenuProps['onClick']> = ({ key }) => {
    setLang(key);
    message.success(key === 'zh' ? '已切换为中文' : 'Switched to English');
  };

  // ===== Theme menu =====
  const themeMenuItems: MenuProps['items'] = [
    { key: 'light', label: '浅色主题', icon: !isDark ? <CheckOutlined /> : null },
    { key: 'dark', label: '暗色主题', icon: isDark ? <CheckOutlined /> : null },
  ];

  const handleThemeMenu: NonNullable<MenuProps['onClick']> = ({ key }) => {
    setIsDark(key === 'dark');
  };

  // ===== Settings menu =====
  const settingsMenuItems: MenuProps['items'] = [
    { key: 'settings', label: '设置...' },
  ];

  const handleSettingsMenu: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'settings') setSettingsModalOpen(true);
  };

  // ===== Plugin menu =====
  const pluginMenuItems: MenuProps['items'] = [
    { key: 'plugin-center', label: '插件中心...' },
    { key: 'open-plugin-dir', label: '打开插件目录' },
  ];

  const handlePluginMenu: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'plugin-center') setPluginModalOpen(true);
    else if (key === 'open-plugin-dir') {
      Modal.info({ title: '插件目录', content: 'Web版暂不支持直接打开文件目录，插件保存在服务器数据目录的 plugins 文件夹中。' });
    }
  };

  // ===== Help menu =====
  const helpMenuItems: MenuProps['items'] = [
    { key: 'check-update', label: '检查更新' },
    { key: 'changelog', label: '更新日志' },
    { key: 'memory-settings', label: '内存设置说明' },
    { key: 'feedback', label: '反馈' },
  ];

  const handleHelpMenu: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'check-update') {
      Modal.info({ title: '检查更新', content: '当前版本: v6.0.12\n已是最新版本。' });
    } else if (key === 'changelog') {
      setChangelogModalOpen(true);
    } else if (key === 'memory-settings') {
      setMemoryModalOpen(true);
    } else if (key === 'feedback') {
      setFeedbackModalOpen(true);
    }
  };

  // ===== About menu =====
  const aboutMenuItems: MenuProps['items'] = [
    { key: 'about', label: '关于 EasyPostman' },
  ];

  const handleAboutMenu: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'about') setAboutModalOpen(true);
  };

  // ===== Workspace switch =====
  const handleWorkspaceSwitch = async (id: string) => {
    if (id === currentWorkspaceId) return;
    try {
      await workspaceApi.switch(id);
      message.success('工作区切换成功');
      // 重新加载，让 currentWorkspaceId 更新；后续的数据刷新由 effect 监听触发
      await loadWorkspaces();
      await loadEnvs();
    } catch {
      message.error('切换工作区失败');
    }
  };

  // 监听当前工作区变化，自动刷新集合树与历史记录
  useEffect(() => {
    if (!currentWorkspaceId) return;
    setSelectedRequest(null);
    setCollectionTreeReloadKey((k) => k + 1);
    setHistoryReloadKey((k) => k + 1);
  }, [currentWorkspaceId]);

  // ===== Render content =====
  // Build variables map from active environment
  const activeEnv = environments.find(e => e.id === activeEnvId);
  const variablesMap: Record<string, string> = {};
  if (activeEnv && activeEnv.variableList) {
    activeEnv.variableList.forEach(v => {
      if (v.enabled) {
        variablesMap[v.key] = v.value;
      }
    });
  }

  const renderContent = () => {
    if (activeTab === 'collection') {
      return (
        <RequestEditor
          request={selectedRequest}
          onRequestChange={setSelectedRequest}
          layoutMode={layoutMode}
          variables={variablesMap}
        />
      );
    }
    if (activeTab === 'environment') {
      return <EnvironmentManager />;
    }
    if (activeTab === 'workspace') {
      return <WorkspaceManager onChange={loadWorkspaces} />;
    }
    if (activeTab === 'functional-test') {
      return <FunctionalTestPanel />;
    }
    if (activeTab === 'performance-test') {
      return <PerformanceTestPanel />;
    }
    if (activeTab === 'toolbox') {
      return <ToolboxPanel />;
    }
    if (activeTab === 'history') {
      return <HistoryPanel reloadTrigger={historyReloadKey} />;
    }
    return null;
  };

  const showSidePanel = sidebarExpanded && activeTab === 'collection';

  const antdTheme = {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };

  return (
    <ConfigProvider locale={lang === 'zh' ? zhCN : enUS} theme={antdTheme}>
      <div className={`flex flex-col h-full ${isDark ? 'dark' : ''}`}>
        {/* ===== TopMenuBar ===== */}
        <div className="flex items-center h-[40px] bg-[#3c3c3c] text-white shrink-0 px-1" style={{ zIndex: 100 }}>
        {/* Left: menus */}
        <div className="flex items-center">
          <Dropdown menu={{ items: fileMenuItems, onClick: handleFileMenu }} trigger={['hover']}>
            <button className="px-3 h-[40px] text-sm hover:bg-[#505050] cursor-pointer bg-transparent border-none text-white">
              文件
            </button>
          </Dropdown>
          <Dropdown menu={{ items: langMenuItems, onClick: handleLangMenu }} trigger={['hover']}>
            <button className="px-3 h-[40px] text-sm hover:bg-[#505050] cursor-pointer bg-transparent border-none text-white">
              语言
            </button>
          </Dropdown>
          <Dropdown menu={{ items: themeMenuItems, onClick: handleThemeMenu }} trigger={['hover']}>
            <button className="px-3 h-[40px] text-sm hover:bg-[#505050] cursor-pointer bg-transparent border-none text-white">
              主题
            </button>
          </Dropdown>
          <Dropdown menu={{ items: settingsMenuItems, onClick: handleSettingsMenu }} trigger={['hover']}>
            <button className="px-3 h-[40px] text-sm hover:bg-[#505050] cursor-pointer bg-transparent border-none text-white">
              设置
            </button>
          </Dropdown>
          <Dropdown menu={{ items: pluginMenuItems, onClick: handlePluginMenu }} trigger={['hover']}>
            <button className="px-3 h-[40px] text-sm hover:bg-[#505050] cursor-pointer bg-transparent border-none text-white">
              插件
            </button>
          </Dropdown>
          <Dropdown menu={{ items: helpMenuItems, onClick: handleHelpMenu }} trigger={['hover']}>
            <button className="px-3 h-[40px] text-sm hover:bg-[#505050] cursor-pointer bg-transparent border-none text-white">
              帮助
            </button>
          </Dropdown>
          <Dropdown menu={{ items: aboutMenuItems, onClick: handleAboutMenu }} trigger={['hover']}>
            <button className="px-3 h-[40px] text-sm hover:bg-[#505050] cursor-pointer bg-transparent border-none text-white">
              关于
            </button>
          </Dropdown>
        </div>

        {/* Right: app info + dropdowns */}
        <div className="flex items-center ml-auto gap-2 pr-2">
          <CloudOutlined className="text-lg" />
          <span className="text-sm font-medium mr-1">EasyPostman</span>
          <div className="w-px h-4 bg-gray-500 mx-1" />
          <Select
            size="small"
            value={currentWorkspaceId || undefined}
            placeholder="选择工作区"
            className="w-28"
            options={workspaces.map((ws) => ({
              value: ws.id,
              label: ws.name,
            }))}
            onChange={handleWorkspaceSwitch}
            popupMatchSelectWidth={false}
          />
          <Select
            size="small"
            value={activeEnvId || undefined}
            placeholder="选择环境"
            className="w-36"
            suffixIcon={
              activeEnvId ? (
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
              ) : null
            }
            options={environments.map((env) => ({
              value: env.id,
              label: (
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      env.id === activeEnvId ? 'bg-green-500' : 'border border-gray-400'
                    }`}
                  />
                  {env.name}
                </span>
              ),
            }))}
            onChange={async (id: string) => {
              await environmentApi.activate(id);
              loadEnvs();
            }}
            popupMatchSelectWidth={false}
          />
        </div>
      </div>

      {/* ===== Main area: Sidebar + Content ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===== TabRail ===== */}
        <div className="w-[50px] bg-[#1f1f1f] flex flex-col shrink-0">
          {/* Tab items */}
          <div className="flex-1 flex flex-col pt-1">
            {SIDEBAR_TABS.map((tab) => (
              <Tooltip key={tab.id} title={tab.label} placement="right" mouseEnterDelay={0.5}>
                <div
                  className={`tab-rail-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {sidebarExpanded && <span className="text-[10px] mt-0.5">{tab.label}</span>}
                </div>
              </Tooltip>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center gap-1 py-2 border-t border-gray-700">
            <button
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer bg-transparent border-none"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              title={sidebarExpanded ? '收起侧边栏' : '展开侧边栏'}
            >
              {sidebarExpanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            </button>
            {sidebarExpanded && (
              <>
                <Tooltip title="全局变量" placement="right">
                  <button
                    className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer bg-transparent border-none"
                    onClick={() => setGlobalVarModalOpen(true)}
                  >
                    <GlobalOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="Cookies" placement="right">
                  <button
                    className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer bg-transparent border-none"
                    onClick={() => setCookieModalOpen(true)}
                  >
                    <DatabaseOutlined />
                  </button>
                </Tooltip>
                <Tooltip title={layoutMode === 'horizontal' ? '切换为上下布局' : '切换为左右布局'} placement="right">
                  <button
                    className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-700 text-gray-400 hover:text-white cursor-pointer bg-transparent border-none"
                    onClick={() => setLayoutMode(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')}
                  >
                    <ColumnWidthOutlined />
                  </button>
                </Tooltip>
              </>
            )}
            <span className="text-[9px] text-gray-600 mt-1">v6.0.12</span>
          </div>
        </div>

        {/* ===== Side panel ===== */}
        {showSidePanel && (
          <>
            <div
              className="shrink-0 border-r border-gray-200 overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              <CollectionTree
                onSelectRequest={setSelectedRequest}
                setActiveTab={(tab: string) => setActiveTab(tab as SidebarTabId)}
                reloadTrigger={collectionTreeReloadKey}
              />
            </div>
            <div
              className="resize-handle"
              onMouseDown={() => setIsResizing(true)}
            />
          </>
        )}

        {/* ===== Main content area ===== */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>

      {/* ===== Modals ===== */}

      {/* Settings Modal */}
      <Modal
        title="设置"
        open={settingsModalOpen}
        onCancel={() => setSettingsModalOpen(false)}
        footer={null}
        width={520}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">请求超时时间（毫秒）</label>
            <input type="number" defaultValue={30000} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最大响应体大小（KB）</label>
            <input type="number" defaultValue={10240} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">自动保存间隔（秒）</label>
            <input type="number" defaultValue={30} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ssl-verify" defaultChecked />
            <label htmlFor="ssl-verify" className="text-sm text-gray-700">验证SSL证书</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="follow-redirect" defaultChecked />
            <label htmlFor="follow-redirect" className="text-sm text-gray-700">跟随重定向</label>
          </div>
        </div>
      </Modal>

      {/* About Modal */}
      <Modal
        title="关于 EasyPostman"
        open={aboutModalOpen}
        onCancel={() => setAboutModalOpen(false)}
        footer={null}
        width={420}
      >
        <div className="text-center py-4">
          <CloudOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <h2 className="text-xl font-bold mt-3">EasyPostman</h2>
          <p className="text-gray-500 mt-1">版本 6.0.12</p>
          <p className="text-gray-500 mt-3">轻量级HTTP接口调试工具</p>
          <p className="text-gray-400 text-xs mt-4">基于 JDK HttpServer + React + Ant Design 构建</p>
          <p className="text-gray-400 text-xs mt-1">Copyright © 2024 EasyPostman</p>
        </div>
      </Modal>

      {/* Changelog Modal */}
      <Modal
        title="更新日志"
        open={changelogModalOpen}
        onCancel={() => setChangelogModalOpen(false)}
        footer={null}
        width={560}
      >
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium text-blue-600">v6.0.12</h4>
            <ul className="list-disc pl-5 text-gray-600 mt-1 space-y-1">
              <li>新增 Web 版本支持</li>
              <li>新增工作区管理功能</li>
              <li>新增功能测试、性能测试模块</li>
              <li>新增工具箱（JSON格式化、编码转换等）</li>
              <li>优化集合树展示和交互</li>
              <li>修复已知问题</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-600">v6.0.11</h4>
            <ul className="list-disc pl-5 text-gray-500 mt-1 space-y-1">
              <li>优化HTTP请求性能</li>
              <li>新增环境变量批量导入</li>
              <li>修复代理设置问题</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Memory Settings Modal */}
      <Modal
        title="内存设置说明"
        open={memoryModalOpen}
        onCancel={() => setMemoryModalOpen(false)}
        footer={null}
        width={480}
      >
        <div className="text-sm text-gray-600 space-y-3">
          <p>EasyPostman Web 版本运行在 JVM 上，内存配置通过 JVM 启动参数控制。</p>
          <div>
            <h4 className="font-medium text-gray-800">推荐配置</h4>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>最小内存: -Xms256m</li>
              <li>最大内存: -Xmx512m</li>
              <li>对于大量请求场景，建议将最大内存调整为 1G</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800">启动示例</h4>
            <code className="block bg-gray-100 p-2 rounded text-xs font-mono">
              java -Xms256m -Xmx512m -jar easy-postman-web-6.0.12-shaded.jar
            </code>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        title="反馈"
        open={feedbackModalOpen}
        onCancel={() => setFeedbackModalOpen(false)}
        onOk={() => {
          message.success('感谢您的反馈！');
          setFeedbackModalOpen(false);
        }}
        okText="提交"
        cancelText="取消"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">反馈类型</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option>Bug报告</option>
              <option>功能建议</option>
              <option>其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">描述</label>
            <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="请详细描述您的问题或建议..." />
          </div>
        </div>
      </Modal>

      {/* Plugin Center Modal */}
      <Modal
        title="插件中心"
        open={pluginModalOpen}
        onCancel={() => setPluginModalOpen(false)}
        footer={null}
        width={600}
      >
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg mb-2">暂无已安装插件</p>
          <p className="text-sm">可将插件 JAR 包放入服务器数据目录的 plugins 文件夹中</p>
        </div>
      </Modal>

      {/* Global Variable Modal */}
      <Modal
        title="全局变量"
        open={globalVarModalOpen}
        onCancel={() => setGlobalVarModalOpen(false)}
        footer={null}
        width={700}
      >
        <GlobalVariablePanel />
      </Modal>

      {/* Cookie Modal */}
      <Modal
        title="Cookies"
        open={cookieModalOpen}
        onCancel={() => setCookieModalOpen(false)}
        footer={null}
        width={700}
      >
        <CookiePanel />
      </Modal>
      </div>
    </ConfigProvider>
  );
}
