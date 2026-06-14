import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Button, Avatar, List, Tag, Statistic, Modal, Form, Input,
  InputNumber, Typography, Space, Empty, Progress, Divider, Drawer, Table, Select, message, Alert
} from 'antd'
import {
  TeamOutlined, PlusOutlined, UpOutlined, BankOutlined, GoldOutlined,
  GiftOutlined, SaveOutlined, HomeOutlined, ExperimentOutlined, CrownOutlined,
  LogoutOutlined, ArrowUpOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import request from '../utils/request'
import { STYLE_BG } from '../utils/constants'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const GuildPage = () => {
  const { user, fetchUserInfo } = useAppStore()
  const [guild, setGuild] = useState<any>(null)
  const [guildList, setGuildList] = useState<any[]>([])
  const [listTotal, setListTotal] = useState(0)
  const [createModal, setCreateModal] = useState(false)
  const [form] = Form.useForm()
  const [donateDrawer, setDonateDrawer] = useState(false)
  const [materials, setMaterials] = useState<any[]>([])
  const [donateItems, setDonateItems] = useState<any[]>([])
  const [donateGold, setDonateGold] = useState(0)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [my, list, inv] = await Promise.all([
        request.get('/guild/my').catch(() => ({ guild: null })),
        request.get('/guild/list?limit=30').catch(() => ({ guilds: [], total: 0 })),
        request.get('/candy/materials').catch(() => ({ materials: [] })),
      ])
      setGuild((my as any).guild)
      setGuildList((list as any).guilds || [])
      setListTotal((list as any).total || 0)
      setMaterials((inv as any).materials || [])
    } catch (e) {}
  }

  const createGuild = async (values: any) => {
    try {
      const res: any = await request.post('/guild/create', values)
      if (res.success) {
        message.success(res.message)
        setCreateModal(false)
        form.resetFields()
        fetchUserInfo()
        loadData()
      }
    } catch (e) {}
  }

  const joinGuild = async (guildId: string) => {
    try {
      const res: any = await request.post(`/guild/${guildId}/join`)
      if (res.success) {
        message.success(res.message)
        fetchUserInfo()
        loadData()
      }
    } catch (e) {}
  }

  const leaveGuild = async () => {
    Modal.confirm({
      title: '确定离开公会？',
      content: '离开后本周贡献将被清除',
      onOk: async () => {
        const res: any = await request.post('/guild/leave')
        if (res.success) {
          message.success(res.message)
          fetchUserInfo()
          loadData()
        }
      },
    })
  }

  const upgrade = async (type: 'workshop' | 'farm') => {
    try {
      const res: any = await request.post(`/guild/upgrade/${type === 'workshop' ? 'workshop' : 'farm'}`)
      if (res.success) {
        message.success(res.message)
        loadData()
      }
    } catch (e) {}
  }

  const openDonate = () => {
    setDonateItems([])
    setDonateGold(0)
    setDonateDrawer(true)
  }

  const addDonateItem = (mat: any) => {
    const existing = donateItems.find((d: any) => d.materialId === mat.materialId)
    if (existing) {
      if (existing.quantity < mat.quantity) existing.quantity += 1
      setDonateItems([...donateItems])
    } else {
      setDonateItems([...donateItems, { materialId: mat.materialId, name: mat.name, quality: mat.quality, quantity: 1, max: mat.quantity }])
    }
  }

  const confirmDonate = async () => {
    try {
      let msg = ''
      if (donateItems.length > 0) {
        const res: any = await request.post('/guild/contribute/materials', {
          contributions: donateItems.map((d: any) => ({ materialId: d.materialId, quantity: d.quantity })),
        })
        if (res.success) msg += `材料贡献值 +${res.totalContributionValue} `
      }
      if (donateGold > 0) {
        const res: any = await request.post('/guild/contribute/gold', { amount: donateGold })
        if (res.success) msg += res.message
      }
      if (msg) message.success(msg)
      setDonateDrawer(false)
      fetchUserInfo()
      loadData()
    } catch (e) {}
  }

  const collectFarm = async () => {
    try {
      const res: any = await request.post('/guild/farm/collect')
      if (res.success) {
        message.success(`${res.message} 获得：${res.items?.map((i: any) => `${i.icon}${i.name}x${i.quantity}`).join('、')}`)
        loadData()
      }
    } catch (e) {}
  }

  const memberColumns = [
    { title: '职位', key: 'role', width: 80, render: (_: any, m: any) => {
      const map: Record<string, { tag: string; color: string }> = {
        leader: { tag: '👑 会长', color: 'gold' },
        officer: { tag: '⚔️ 干部', color: 'magenta' },
        member: { tag: '🎯 成员', color: 'blue' },
      }
      const r = map[m.role] || map.member
      return <Tag color={r.color}>{r.tag}</Tag>
    }},
    {
      title: '成员', key: 'member',
      render: (_: any, m: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ background: '#FFE4EC' }}>{m.playerId?.avatar || '🍬'}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{m.playerId?.nickname || '未知'}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>加入: {dayjs(m.joinedAt).format('YYYY-MM-DD')}</Text>
          </div>
        </div>
      ),
    },
    { title: '本周贡献', dataIndex: 'weeklyContribution', key: 'weekly', width: 110, render: (v: number) => <b style={{ color: '#52c41a' }}>{v?.toLocaleString() || 0}</b> },
    { title: '总贡献', dataIndex: 'totalContribution', key: 'total', width: 120, render: (v: number) => <b style={{ color: '#722ed1' }}>{v?.toLocaleString() || 0}</b> },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}><TeamOutlined style={{ color: '#FF69B4' }} /> 糖果公会</Title>
          <Text type="secondary">联合建设公会，解锁强力加成！</Text>
        </Col>
        <Col>
          <Space>
            {!guild && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                创建公会（50,000💰）
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {guild ? (
        <div>
          <Card
            className="candy-card"
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                height: 160,
                background: STYLE_BG.rainbow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                position: 'relative',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56 }}>{guild.emblem || '🏰'}</div>
                <Title level={2} style={{ color: 'white', margin: '4px 0' }}>{guild.name}</Title>
                <Tag color="white" style={{ fontSize: 13 }}>Lv.{guild.level}</Tag>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                {guild.description || '（暂无介绍）'}
              </Paragraph>
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}><Statistic title="成员数" value={`${guild.members?.length || 0}/50`} /></Col>
                <Col xs={12} md={6}><Statistic title="公会经验" value={guild.exp?.toLocaleString() || 0} /></Col>
                <Col xs={12} md={6}><Statistic title="公会金币" value={guild.gold?.toLocaleString() || 0} prefix={<GoldOutlined />} /></Col>
                <Col xs={12} md={6}><Statistic title="获胜次数" value={guild.totalContestsWon || 0} /></Col>
              </Row>

              <Divider plain>公会加成</Divider>
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                  <Card size="small" className="candy-card">
                    <Statistic title="熬糖成功率 +" value={(guild.bonuses?.successRateBonus * 100 || 0).toFixed(1)} suffix="%" valueStyle={{ color: '#52c41a' }} />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" className="candy-card">
                    <Statistic title="农场产出 +" value={(guild.bonuses?.materialYieldBonus * 100 || 0).toFixed(1)} suffix="%" valueStyle={{ color: '#1890ff' }} />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" className="candy-card">
                    <Statistic title="暴击率 +" value={(guild.bonuses?.critRateBonus * 100 || 0).toFixed(1)} suffix="%" valueStyle={{ color: '#DAA520' }} />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={6}>
                  <Button type="primary" block icon={<SaveOutlined />} size="large" onClick={openDonate}>捐献</Button>
                </Col>
                <Col xs={24} md={6}>
                  <Button block icon={<ExperimentOutlined />} size="large" onClick={collectFarm}>
                    收获农场
                  </Button>
                </Col>
                {(['leader', 'officer'].includes(guild.members?.find((m: any) => m.playerId?._id === user?.id || m.playerId === user?.id)?.role) ||
                  (guild.leaderId?._id === user?.id || guild.leaderId === user?.id)) && (
                  <>
                    <Col xs={24} md={6}>
                      <Button block icon={<HomeOutlined />} size="large" onClick={() => upgrade('workshop')}>
                        联合工坊 Lv.{guild.jointWorkshopLevel}
                      </Button>
                    </Col>
                    <Col xs={24} md={6}>
                      <Button block icon={<ExperimentOutlined />} size="large" onClick={() => upgrade('farm')}>
                        蜜糖农场 Lv.{guild.honeyFarmLevel}
                      </Button>
                    </Col>
                  </>
                )}
                {!(guild.leaderId?._id === user?.id || guild.leaderId === user?.id) && (
                  <Col xs={24} md={6}>
                    <Button block danger icon={<LogoutOutlined />} size="large" onClick={leaveGuild}>
                      离开公会
                    </Button>
                  </Col>
                )}
              </Row>
            </div>
          </Card>

          <Card title={`👥 公会成员 (${guild.members?.length || 0})`} className="candy-card">
            <Table
              dataSource={guild.members || []}
              rowKey={(m: any) => m.playerId?._id || m.playerId}
              columns={memberColumns}
              pagination={false}
              size="middle"
            />
          </Card>
        </div>
      ) : (
        <Card title="🏰 推荐公会" className="candy-card" extra={<Tag color="blue">共 {listTotal} 个公会</Tag>}>
          {guildList.length ? (
            <Row gutter={[12, 12]}>
              {guildList.map((g: any) => (
                <Col xs={24} md={12} lg={8} key={g._id}>
                  <Card className="candy-card" hoverable
                    extra={
                      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => joinGuild(g._id)}>
                        申请加入
                      </Button>
                    }
                  >
                    <Card.Meta
                      avatar={
                        <Avatar size={48} style={{
                          background: STYLE_BG.rainbow, fontSize: 24,
                          border: 'none',
                        }}>
                          {g.emblem || '🏰'}
                        </Avatar>
                      }
                      title={
                        <div>
                          {g.name}
                          <Tag color="magenta" style={{ marginLeft: 6 }}>Lv.{g.level}</Tag>
                          <Tag color="gold" style={{ marginLeft: 4 }}>{g.members?.length}/50</Tag>
                        </div>
                      }
                      description={
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            会长：{g.leaderId?.nickname || '未知'}
                          </Text>
                          <div style={{ marginTop: 4, fontSize: 12 }}>
                            {g.description?.slice(0, 50) || '暂无介绍'}
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="暂无公会，快去创建第一个吧！">
              <Button type="primary" onClick={() => setCreateModal(true)}>创建公会</Button>
            </Empty>
          )}
        </Card>
      )}

      <Modal
        title="✨ 创建公会"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={createGuild}>
          <Row gutter={12}>
            <Col span={20}>
              <Form.Item name="name" label="公会名称" rules={[{ required: true, message: '请输入公会名称' }]}>
                <Input size="large" placeholder="给公会起个响亮的名字" maxLength={12} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="emblem" label="徽章" initialValue="🏰">
                <Select size="large">
                  {['🏰', '🌸', '🔥', '🌊', '⚔️', '✨', '🍬', '🍰', '🌙', '🌈', '🦄', '💎'].map(e => (
                    <Option key={e} value={e} style={{ fontSize: 22 }}>{e}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="公会简介">
            <Input.TextArea rows={3} maxLength={100} showCount placeholder="介绍一下你的公会..." />
          </Form.Item>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="创建公会需要消耗 50,000 金币"
            description={`当前金币：${user?.gold?.toLocaleString() || 0} 💰`}
          />
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            icon={<CrownOutlined />}
            disabled={(user?.gold || 0) < 50000}
          >
            创建公会
          </Button>
        </Form>
      </Modal>

      <Drawer
        title="🎁 为公会捐献"
        width={520}
        open={donateDrawer}
        onClose={() => setDonateDrawer(false)}
        extra={
          <Button type="primary" icon={<UpOutlined />} onClick={confirmDonate} disabled={donateItems.length === 0 && !donateGold}>
            确认捐献
          </Button>
        }
      >
        <Card size="small" style={{ marginBottom: 16 }} title="💰 捐献金币">
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              min={0}
              max={user?.gold || 0}
              value={donateGold}
              onChange={(v) => setDonateGold(v || 0)}
              size="large"
              style={{ width: '80%' }}
              addonAfter={`/ ${user?.gold?.toLocaleString() || 0}`}
            />
            <Button size="large" onClick={() => setDonateGold(Math.floor((user?.gold || 0) / 10))}>捐10%</Button>
            <Button size="large" onClick={() => setDonateGold(user?.gold || 0)}>全部</Button>
          </Space.Compact>
        </Card>

        <Card
          size="small"
          title={`🌿 捐献原料（已选 ${donateItems.length} 种）`}
          style={{ marginBottom: 16 }}
        >
          {donateItems.length > 0 && (
            <List size="small" style={{ marginBottom: 12 }}>
              {donateItems.map((d: any, idx: number) => (
                <List.Item key={idx}>
                  <span>{d.name} <Tag color="magenta">x{d.quantity}/{d.max}</Tag></span>
                  <Button size="small" danger onClick={() => setDonateItems(donateItems.filter((_, i) => i !== idx))}>
                    移除
                  </Button>
                </List.Item>
              ))}
            </List>
          )}
          {materials.length ? (
            <Row gutter={[6, 6]}>
              {materials.map((m: any) => {
                const existing = donateItems.find((d: any) => d.materialId === m.materialId)
                return (
                  <Col xs={24} sm={12} key={m.materialId}>
                    <Card
                      size="small"
                      hoverable
                      style={{
                        cursor: 'pointer',
                        borderLeft: `3px solid ${existing ? '#52c41a' : '#eee'}`,
                        opacity: existing ? 0.6 : 1,
                      }}
                      onClick={() => addDonateItem(m)}
                      bodyStyle={{ padding: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar size={24}>{m.icon}</Avatar>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#999' }}>库存 {m.quantity}</div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          ) : <Empty description="背包没有原料" />}
        </Card>
      </Drawer>
    </div>
  )
}

export default GuildPage
