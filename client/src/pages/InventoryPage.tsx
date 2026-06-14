import { useState, useEffect } from 'react'
import { Row, Col, Card, Tabs, List, Avatar, Tag, Statistic, Select, Empty, Typography, Button, Space, Tooltip } from 'antd'
import {
  InboxOutlined, GiftOutlined, FileProtectOutlined, PaperClipOutlined
} from '@ant-design/icons'
import request from '../utils/request'
import {
  QUALITY_NAMES, QUALITY_COLORS, MATERIAL_TYPE_NAMES, MATERIAL_TYPE_ICONS,
  EFFECT_NAMES, AFFIX_NAMES
} from '../utils/constants'

const { Title, Text } = Typography

const InventoryPage = () => {
  const [tab, setTab] = useState('materials')
  const [materials, setMaterials] = useState<any[]>([])
  const [specials, setSpecials] = useState<any[]>([])
  const [candies, setCandies] = useState<any[]>([])
  const [filterType, setFilterType] = useState<string>()
  const [filterQuality, setFilterQuality] = useState<string>()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadAll()
  }, [page])

  const loadAll = async () => {
    const [inv, c] = await Promise.all([
      request.get('/candy/materials').catch(() => ({ materials: [], specialItems: [] })),
      request.get(`/candy/candies/my?page=${page}&limit=12`).catch(() => ({ candies: [], total: 0 })),
    ])
    setMaterials((inv as any).materials || [])
    setSpecials((inv as any).specialItems || [])
    setCandies((c as any).candies || [])
    setTotal((c as any).total || 0)
  }

  const filteredMats = materials.filter(m => {
    if (filterType && m.type !== filterType) return false
    if (filterQuality && m.quality !== filterQuality) return false
    return true
  })

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}><InboxOutlined style={{ color: '#FF69B4' }} /> 原料背包</Title>
          <Text type="secondary">存放所有原料、特殊道具和成品糖果</Text>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="candy-card"><Statistic title="原料种类" value={materials.length} suffix="种" /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="candy-card"><Statistic title="原料总数" value={materials.reduce((s, m) => s + m.quantity, 0)} suffix="份" /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="candy-card"><Statistic title="成品糖果" value={total} suffix="件" /></Card>
        </Col>
      </Row>

      <Card className="candy-card" bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          size="large"
          items={[
            {
              key: 'materials',
              label: <span><GiftOutlined /> 魔法原料 ({materials.length})</span>,
              children: (
                <div style={{ padding: 24 }}>
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col>
                      <Select
                        placeholder="按类型筛选"
                        allowClear
                        value={filterType}
                        onChange={setFilterType}
                        style={{ width: 160 }}
                        options={Object.entries(MATERIAL_TYPE_NAMES).map(([v, l]) => ({ label: `${MATERIAL_TYPE_ICONS[v]} ${l}`, value: v }))}
                      />
                    </Col>
                    <Col>
                      <Select
                        placeholder="按品质筛选"
                        allowClear
                        value={filterQuality}
                        onChange={setFilterQuality}
                        style={{ width: 140 }}
                        options={Object.entries(QUALITY_NAMES).map(([v, l]) => ({ label: l, value: v }))}
                      />
                    </Col>
                  </Row>
                  {filteredMats.length ? (
                    <Row gutter={[12, 12]}>
                      {filteredMats.map((m: any) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={m.materialId}>
                          <Card className="candy-card" hoverable
                            bodyStyle={{ padding: 12 }}
                            style={{ borderLeft: `4px solid ${QUALITY_COLORS[m.quality]}` }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar size={44} style={{ fontSize: 26 }}>{m.icon}</Avatar>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{m.name}</div>
                                <Space size={4} wrap>
                                  <Tag color={QUALITY_COLORS[m.quality]} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                                    {QUALITY_NAMES[m.quality]}
                                  </Tag>
                                  <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                                    {MATERIAL_TYPE_ICONS[m.type]}
                                  </Tag>
                                </Space>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: 6 }}>
                              <Tag color="magenta" style={{ fontSize: 14 }}>x{m.quantity}</Tag>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty description="暂无原料，快去采集吧！" />
                  )}
                </div>
              ),
            },
            {
              key: 'specials',
              label: <span><PaperClipOutlined /> 特殊道具</span>,
              children: (
                <div style={{ padding: 24 }}>
                  {specials.length ? (
                    <Row gutter={[12, 12]}>
                      {specials.map((s: any) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={s.itemId}>
                          <Card className="candy-card" hoverable bodyStyle={{ padding: 12 }}
                            style={{ borderLeft: '4px solid #722ed1' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar size={44} style={{ fontSize: 26 }}>{s.icon}</Avatar>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                                <Tooltip title={s.description}>
                                  <Text type="secondary" style={{ fontSize: 11 }} ellipsis>{s.description}</Text>
                                </Tooltip>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: 6 }}>
                              <Tag color="purple" style={{ fontSize: 14 }}>x{s.quantity}</Tag>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty description="暂无特殊道具" />
                  )}
                </div>
              ),
            },
            {
              key: 'candies',
              label: <span><FileProtectOutlined /> 成品糖果 ({total})</span>,
              children: (
                <div style={{ padding: 24 }}>
                  {candies.length ? (
                    <Row gutter={[12, 12]}>
                      {candies.map((c: any) => (
                        <Col xs={24} md={12} lg={8} key={c._id}>
                          <Card className="candy-card" hoverable
                            style={{ borderLeft: `4px solid ${QUALITY_COLORS[c.quality]}`, borderTop: c.critHit ? '3px solid #FFD700' : undefined }}
                          >
                            <Card.Meta
                              avatar={<Avatar size={52} style={{ background: c.color, fontSize: 28 }}>{c.icon}</Avatar>}
                              title={
                                <div>
                                  {c.name}
                                  {c.critHit && <Tag className="crit-badge">暴击</Tag>}
                                  <Tag color={QUALITY_COLORS[c.quality]}>{QUALITY_NAMES[c.quality]}</Tag>
                                  {c.inTrade && <Tag color="blue">交易中</Tag>}
                                </div>
                              }
                              description={
                                <div>
                                  {c.affixes?.map((a: string) => <Tag key={a} className="affix-tag" style={{ fontSize: 11 }}>{AFFIX_NAMES[a]}</Tag>)}
                                  {c.specialEffects?.map((e: string) => <Tag key={e} className="effect-tag" style={{ fontSize: 11 }}>{EFFECT_NAMES[e]}</Tag>)}
                                  <div style={{ marginTop: 6, fontSize: 12 }}>
                                    甜度 <b>{c.sweetness}</b> · 魔力 <b>{c.magicDuration}s</b> · 稀有度 <b>{c.rarityScore}</b>
                                  </div>
                                </div>
                              }
                            />
                            <div style={{ marginTop: 8, textAlign: 'right' }}>
                              <Tag color="magenta" style={{ fontSize: 14 }}>x{c.quantity}</Tag>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty description="还没有成品糖果，去熬糖台制作吧！">
                      <Button type="primary">去熬糖</Button>
                    </Empty>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default InventoryPage
