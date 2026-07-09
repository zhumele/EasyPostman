import { Button, Space, Empty, Card, Row, Col, Statistic } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined } from '@ant-design/icons'

export default function PerformancePage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">性能测试</div>
        <Space>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => {}}>
            开始测试
          </Button>
          <Button icon={<PauseCircleOutlined />}>暂停</Button>
          <Button danger icon={<StopOutlined />}>停止</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总请求数" value={0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="QPS" value={0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均响应时间" value={0} suffix="ms" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="错误率" value={0} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Card title="测试计划" style={{ marginBottom: 16 }}>
        <Empty description="暂无性能测试计划" />
      </Card>

      <Card title="实时监控">
        <Empty description="测试运行中时显示实时图表" />
      </Card>
    </div>
  )
}
