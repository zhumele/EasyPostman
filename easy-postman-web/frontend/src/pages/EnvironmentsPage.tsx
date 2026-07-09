import { useState } from 'react'
import { List, Button, Modal, Form, Input, Space, Tag, Empty, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons'

interface EnvVar {
  key: string
  value: string
  enabled: boolean
}

interface Environment {
  id: string
  name: string
  variables: EnvVar[]
}

const mockEnvs: Environment[] = [
  {
    id: '1',
    name: '开发环境',
    variables: [
      { key: 'baseUrl', value: 'http://dev.example.com', enabled: true },
      { key: 'token', value: 'dev-token-123', enabled: true },
    ],
  },
  {
    id: '2',
    name: '测试环境',
    variables: [
      { key: 'baseUrl', value: 'http://test.example.com', enabled: true },
    ],
  },
]

export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState<Environment[]>(mockEnvs)
  const [activeId, setActiveId] = useState<string>('1')
  const [selectedId, setSelectedId] = useState<string | null>('1')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
  const [form] = Form.useForm()

  const handleCreate = () => {
    setEditingEnv(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (env: Environment) => {
    setEditingEnv(env)
    form.setFieldsValue({
      name: env.name,
      variables: env.variables.map((v) => `${v.key}=${v.value}`).join('\n'),
    })
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setEnvs(envs.filter((e) => e.id !== id))
    if (selectedId === id) setSelectedId(null)
    message.success('删除成功')
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const vars: EnvVar[] = (values.variables || '')
        .split('\n')
        .filter((line: string) => line.trim() && line.includes('='))
        .map((line: string) => {
          const [k, ...rest] = line.split('=')
          return { key: k.trim(), value: rest.join('=').trim(), enabled: true }
        })

      if (editingEnv) {
        setEnvs(envs.map((e) => (e.id === editingEnv.id ? { ...e, name: values.name, variables: vars } : e)))
        message.success('更新成功')
      } else {
        const newEnv: Environment = {
          id: Date.now().toString(),
          name: values.name,
          variables: vars,
        }
        setEnvs([...envs, newEnv])
        message.success('创建成功')
      }
      setModalOpen(false)
    })
  }

  const selectedEnv = envs.find((e) => e.id === selectedId)

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">环境变量管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建环境
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 280, border: '1px solid #e8e8e8', borderRadius: 4, minHeight: 400 }}>
          <List
            dataSource={envs}
            renderItem={(item) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: selectedId === item.id ? '#e6f4ff' : 'transparent',
                  padding: '12px 16px',
                }}
                onClick={() => setSelectedId(item.id)}
                actions={[
                  <Button
                    key="activate"
                    type={activeId === item.id ? 'primary' : 'default'}
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveId(item.id)
                      message.success(`已切换到「${item.name}」`)
                    }}
                  >
                    {activeId === item.id ? '已激活' : '激活'}
                  </Button>,
                ]}
              >
                <List.Item.Meta title={item.name} description={`${item.variables.length} 个变量`} />
              </List.Item>
            )}
          />
          {envs.length === 0 && <Empty description="暂无环境" style={{ padding: 40 }} />}
        </div>

        <div style={{ flex: 1, border: '1px solid #e8e8e8', borderRadius: 4, padding: 16, minHeight: 400 }}>
          {selectedEnv ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{selectedEnv.name}</h3>
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedEnv)}>
                    编辑
                  </Button>
                  <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedEnv.id)}>
                    删除
                  </Button>
                </Space>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8e8e8' }}>
                    <th style={{ textAlign: 'left', padding: '8px', width: 40 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>变量名</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>值</th>
                    <th style={{ textAlign: 'left', padding: '8px', width: 80 }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEnv.variables.map((v, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px' }}>{v.key}</td>
                      <td style={{ padding: '8px', color: '#666' }}>{v.value}</td>
                      <td style={{ padding: '8px' }}>
                        <Tag color={v.enabled ? 'green' : 'default'}>{v.enabled ? '启用' : '禁用'}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedEnv.variables.length === 0 && <Empty description="暂无变量" style={{ padding: 40 }} />}
            </>
          ) : (
            <Empty description="请选择一个环境" style={{ padding: 60 }} />
          )}
        </div>
      </div>

      <Modal
        title={editingEnv ? '编辑环境' : '新建环境'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="环境名称" rules={[{ required: true, message: '请输入环境名称' }]}>
            <Input placeholder="请输入环境名称" />
          </Form.Item>
          <Form.Item name="variables" label="变量 (格式: key=value，每行一个)">
            <Input.TextArea rows={8} placeholder="baseUrl=http://example.com&#10;token=abc123" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
