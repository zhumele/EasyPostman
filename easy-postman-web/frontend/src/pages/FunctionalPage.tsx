import { Button, Table, Space, Empty, Upload, message } from 'antd'
import { PlayCircleOutlined, UploadOutlined } from '@ant-design/icons'

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '方法', dataIndex: 'method', key: 'method', width: 80 },
  { title: 'URL', dataIndex: 'url', key: 'url' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '耗时', dataIndex: 'time', key: 'time', width: 100 },
]

const data = [
  { key: '1', name: '获取用户列表', method: 'GET', url: '/api/users', status: '通过', time: '123ms' },
  { key: '2', name: '创建用户', method: 'POST', url: '/api/users', status: '通过', time: '89ms' },
]

export default function FunctionalPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">功能测试</div>
        <Space>
          <Upload showUploadList={false} beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>导入 CSV</Button>
          </Upload>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => message.info('执行功能测试')}>
            批量执行
          </Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={data} pagination={false} />

      {data.length === 0 && <Empty description="暂无测试用例" style={{ padding: 60 }} />}
    </div>
  )
}
