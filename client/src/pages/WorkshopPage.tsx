import { useState } from 'react'
import { Row, Col, Card, Form, Input, Select, Switch, Button, message, Modal, Statistic, Progress, Tag, Avatar, Typography } from 'antd'
import { HomeOutlined, ArrowUpOutlined, FireOutlined, ApiOutlined, FormatPainterOutlined, SettingOutlined, SaveOutlined } from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import request from '../utils/request'
import { WORKSHOP_STYLE_NAMES, STYLE_BG } from '../utils/constants'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const WorkshopPage = () => {
  const { workshop, user, fetchUserInfo } = useAppStore()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [editModal, setEditModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)

  const openEdit = () => {
    form.setFieldsValue({
      name: workshop?.name,
      style: workshop?.style,
      isPublic: workshop?.isPublic,
    })
    setEditModal(true)
  }

  const handleSave = async (values: any) => {
    setLoading(true)
    try {
      await request.put('/workshop/my', values)
      message.success('工坊设置已保存！')
      setEditModal(false)
      fetchUserInfo()
    } finally { setLoading(false) }
  }

  const upgradeStation = async (station: 'candyPot' | 'mixingBowl' | 'decorationTable') => {
    setUpgradeLoading(station)
    try {
      const res: any = await request.post(`/workshop/upgrade/${station}`)
      if (res.success) {
        message.success(res.message)
        fetchUserInfo()
      }
    } finally { setUpgradeLoading(null) }
  }

  const stationLabels: Record<string, { name: string; icon: any; desc: string }> = {
    candyPot: { name: '熬糖台', icon: <FireOutlined />, desc: '提升熬糖成功率与基础品质' },
    mixingBowl: { name: '搅拌碗', icon: <ApiOutlined />, desc: '提升原料搭配与混合效果' },
    decorationTable: { name: '装饰台', icon: <FormatPainterOutlined />, desc: '提升配方研发与词缀概率' },
  }

  if (!workshop) return null

  return (
    <div>
      <Row gutter={[16, 16]} justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <HomeOutlined style={{ color: '#FF69B4' }} /> 我的糖果工坊
          </Title>
          <Text type="secondary">精心布置，打造属于你的甜蜜殿堂~</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<SettingOutlined />} onClick={openEdit}>工坊设置</Button>
        </Col>
      </Row>

      <Card
        className="candy-card"
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: 0, overflow: 'hidden' }}
      >
        <div
          style={{
            height: 220,
            background: STYLE_BG[workshop.style] || STYLE_BG.rainbow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ textAlign: 'center', color: 'white', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 72, marginBottom: 12 }}>🏠</div>
            <Title level={2} style={{ color: 'white', margin: 0 }}>{workshop.name}</Title>
            <div style={{ marginTop: 8, fontSize: 16, opacity: 0.95 }}>
              {WORKSHOP_STYLE_NAMES[workshop.style] || '神秘工坊'}
              <Tag color="white" style={{ marginLeft: 12 }}>Lv.{workshop.level}</Tag>
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic title="总制作糖果数" value={workshop.totalCandiesMade} suffix="个" />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="工坊声望" value={workshop.reputation} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="是否公开" value={workshop.isPublic ? '公开可见' : '仅自己'} />
            </Col>
          </Row>
        </div>
      </Card>

      <Title level={4}>🔧 工坊设备</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {(['candyPot', 'mixingBowl', 'decorationTable'] as const).map(key => {
          const station = (workshop.stations as any)[key]
          const info = stationLabels[key]
          const nextCost = station.level * 5000
          const canUpgrade = (user?.gold || 0) >= nextCost
          return (
            <Col xs={24} md={8} key={key}>
              <Card className="candy-card" hoverable>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar size={48} style={{ background: 'linear-gradient(135deg, #FFB6C1, #FF69B4)', fontSize: 22 }}>
                    {info.icon}
                  </Avatar>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{station.name || info.name}</div>
                    <Tag color="magenta">Lv.{station.level}</Tag>
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                  {info.desc}
                </Text>
                <Progress
                  percent={(station.level / 10) * 100}
                  showInfo
                  format={(p) => `${Math.round((p || 0) / 10)}/10 级`}
                  strokeColor={{ from: '#FF69B4', to: '#FF1493' }}
                  style={{ marginBottom: 12 }}
                />
                <Button
                  type="primary"
                  block
                  icon={<ArrowUpOutlined />}
                  disabled={!canUpgrade || station.level >= 10}
                  loading={upgradeLoading === key}
                  onClick={() => upgradeStation(key)}
                >
                  {station.level >= 10 ? '已满级' : `升级 (${nextCost.toLocaleString()} 💰)`}
                </Button>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="🎨 工坊快捷操作" className="candy-card">
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Button type="primary" block size="large" icon={<FireOutlined />} onClick={() => navigate('/candy-pot')}>
                  去熬糖
                </Button>
              </Col>
              <Col span={12}>
                <Button block size="large" onClick={() => navigate('/inventory')}>
                  查看原料
                </Button>
              </Col>
              <Col span={12}>
                <Button block size="large" onClick={() => navigate('/recipe')}>
                  研发配方
                </Button>
              </Col>
              <Col span={12}>
                <Button block size="large" onClick={() => navigate('/contest')}>
                  参加大赛
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="💡 小贴士" className="candy-card">
            <ul style={{ paddingLeft: 18, lineHeight: 2 }}>
              <li>升级熬糖台可显著提升基础熬糖成功率</li>
              <li>装饰台等级越高，研发新配方的成功率越高</li>
              <li>高等级工坊有机会触发隐藏特殊词缀</li>
              <li>设置为公开后，其他玩家可浏览您的工坊</li>
              <li>参加公会后，可解锁联合工坊加成！</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Modal
        title="工坊设置"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="工坊名称" rules={[{ required: true, message: '请输入工坊名称' }]}>
            <Input size="large" prefix={<SaveOutlined />} maxLength={20} />
          </Form.Item>
          <Form.Item name="style" label="工坊风格" rules={[{ required: true }]}>
            <Select
              size="large"
              options={Object.entries(WORKSHOP_STYLE_NAMES).map(([v, label]) => ({ label, value: v }))}
            />
          </Form.Item>
          <Form.Item name="isPublic" label="公开工坊" valuePropName="checked">
            <Switch checkedChildren="公开" unCheckedChildren="私密" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            保存设置
          </Button>
        </Form>
      </Modal>
    </div>
  )
}

export default WorkshopPage
