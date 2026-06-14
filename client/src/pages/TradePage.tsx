import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Tabs, List, Avatar, Tag, Button, Modal, Form, InputNumber, Select,
  Table, Statistic, Empty, Typography, Space, Popconfirm, message, Input
} from 'antd'
import {
  ShoppingCartOutlined, ShoppingOutlined, ShopOutlined, RiseOutlined,
  DollarOutlined, GoldOutlined, TagOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import request from '../utils/request'
import { QUALITY_NAMES, QUALITY_COLORS, EFFECT_NAMES, AFFIX_NAMES } from '../utils/constants'
import dayjs from 'dayjs'
import { getSocket } from '../utils/socket'

const { Title, Text, Paragraph } = Typography

const TradePage = () => {
  const { user, fetchUserInfo } = useAppStore()
  const [tab, setTab] = useState('market')
  const [form] = Form.useForm()
  const [listings, setListings] = useState<any[]>([])
  const [mySales, setMySales] = useState<any[]>([])
  const [myPurchases, setMyPurchases] = useState<any[]>([])
  const [listModal, setListModal] = useState<{ open: boolean; item: any; itemType: string }>({ open: false, item: null, itemType: '' })
  const [buyModal, setBuyModal] = useState<any>(null)
  const [priceSuggest, setPriceSuggest] = useState<any>(null)
  const [itemFilter, setItemFilter] = useState<string>()
  const [qualityFilter, setQualityFilter] = useState<string>()
  const [sortBy, setSortBy] = useState<string>('newest')
  const [myCandies, setMyCandies] = useState<any[]>([])
  const [myRecipes, setMyRecipes] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadTabData()
  }, [tab, page, itemFilter, qualityFilter, sortBy])

  useEffect(() => {
    const socket = getSocket()
    if (socket) {
      socket.on('trade_completed', () => {
        setTimeout(loadTabData, 1000)
      })
    }
  }, [])

  const loadTabData = async () => {
    try {
      if (tab === 'market') {
        const res: any = await request.get(
          `/trade/marketplace?page=${page}&limit=12&sortBy=${sortBy}${itemFilter ? `&itemType=${itemFilter}` : ''}${qualityFilter ? `&quality=${qualityFilter}` : ''}`
        )
        setListings(res.trades || [])
        setTotal(res.total || 0)
      }
      if (tab === 'sell') {
        const [s, p, c, r] = await Promise.all([
          request.get('/trade/my/seller?limit=20').catch(() => ({ trades: [] })),
          request.get('/trade/my/buyer?limit=20').catch(() => ({ trades: [] })),
          request.get('/candy/candies/my?limit=100').catch(() => ({ candies: [] })),
          request.get('/candy/recipes/approved?limit=50').catch(() => ({ recipes: [] })),
        ])
        setMySales((s as any).trades || [])
        setMyPurchases((p as any).trades || [])
        setMyCandies(((c as any).candies || []).filter((x: any) => !x.inTrade))
        setMyRecipes((r as any).recipes || [])
      }
    } catch (e) {}
  }

  const openListModal = (item: any, itemType: string) => {
    setListModal({ open: true, item, itemType })
    form.resetFields()
    setPriceSuggest(null)
    loadPriceSuggest(item._id, itemType)
  }

  const loadPriceSuggest = async (itemId: string, itemType: string) => {
    try {
      const res: any = await request.get(`/trade/suggest-price?itemId=${itemId}&itemType=${itemType}`)
      setPriceSuggest(res)
      form.setFieldsValue({ askingPrice: Math.round((res.suggestedMin + res.suggestedMax) / 2) })
    } catch (e) {}
  }

  const handleList = async (values: any) => {
    try {
      const { item, itemType } = listModal
      const res: any = await request.post('/trade/list', {
        itemType,
        itemId: item._id,
        quantity: values.quantity || 1,
        askingPrice: values.askingPrice,
      })
      if (res.success) {
        message.success(res.message)
        setListModal({ open: false, item: null, itemType: '' })
        fetchUserInfo()
        loadTabData()
      }
    } catch (e) {}
  }

  const handleBuy = async () => {
    try {
      const res: any = await request.post(`/trade/${buyModal._id}/buy`)
      if (res.success) {
        Modal.success({
          title: '🎉 购买成功！',
          content: (
            <div>
              <p>{res.message}</p>
              {res.festivalTriggered && <p style={{ color: '#FFD700', fontWeight: 'bold' }}>🎊 您触发了糖果节！全服暴击率提升！</p>}
            </div>
          ),
        })
        setBuyModal(null)
        fetchUserInfo()
        loadTabData()
      }
    } catch (e) {}
  }

  const cancelTrade = async (tradeId: string) => {
    const res: any = await request.post(`/trade/${tradeId}/cancel`)
    if (res.success) {
      message.success(res.message)
      loadTabData()
    }
  }

  const renderTradeCard = (t: any, showActions: boolean = false) => {
    const isCandy = t.itemType === 'candy'
    const item = t.candyId || t.recipeId || {}
    const quality = (item as any).quality
    return (
      <Card className="candy-card" hoverable style={{ height: '100%' }}
        bodyStyle={{ padding: 12 }}
        extra={
          showActions && t.status === 'listed' ? (
            <Popconfirm title="确定下架？" onConfirm={() => cancelTrade(t._id)}>
              <Button size="small" danger>下架</Button>
            </Popconfirm>
          ) : null
        }
      >
        <Row gutter={8} align="top">
          <Col>
            <Avatar size={48} style={{
              background: isCandy ? (item as any).color || '#FFB6C1' : 'linear-gradient(135deg, #f093fb, #4facfe)',
              fontSize: 26,
            }}>
              {isCandy ? (item as any).icon || '🍬' : '📜'}
            </Avatar>
          </Col>
          <Col flex="auto">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
              {(item as any).name || (isCandy ? '糖果' : '配方')}
            </div>
            <Space size={4} wrap style={{ marginBottom: 4 }}>
              {isCandy && quality && <Tag color={QUALITY_COLORS[quality]} style={{ fontSize: 10, margin: 0 }}>{QUALITY_NAMES[quality]}</Tag>}
              {!isCandy && (item as any).targetQuality && (
                <Tag color={QUALITY_COLORS[(item as any).targetQuality]} style={{ fontSize: 10, margin: 0 }}>
                  {QUALITY_NAMES[(item as any).targetQuality]}
                </Tag>
              )}
              <Tag style={{ fontSize: 10, margin: 0 }}>{isCandy ? '糖果' : '配方'}</Tag>
              {t.status === 'completed' && <Tag color="green" style={{ fontSize: 10, margin: 0 }}>已成交</Tag>}
              {t.status === 'cancelled' && <Tag color="default" style={{ fontSize: 10, margin: 0 }}>已下架</Tag>}
              {t.triggersFestival && <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>🎉 糖果节</Tag>}
            </Space>
            <div style={{ fontSize: 11, color: '#888' }}>
              卖家：{t.sellerId?.nickname || '未知'} · {dayjs(t.listedAt || t.completedAt).format('MM-DD HH:mm')}
            </div>
            {isCandy && (
              <div style={{ fontSize: 11, marginTop: 2 }}>
                <Text type="secondary">稀有度 </Text>
                <b>{(item as any).rarityScore}</b>
                <Text type="secondary" style={{ marginLeft: 6 }}>甜度 </Text>
                <b>{(item as any).sweetness}</b>
              </div>
            )}
          </Col>
        </Row>
        <Row align="middle" justify="space-between" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #f0f0f0' }}>
          <Col>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#FF8C00' }}>
              💰 {(t.askingPrice || 0).toLocaleString()}
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                {t.quantity > 1 ? ` x${t.quantity}` : ''}
              </Text>
            </div>
          </Col>
          {showActions ? null : t.status === 'listed' && t.sellerId?._id !== user?.id && t.sellerId !== user?.id ? (
            <Button type="primary" size="small" icon={<ShoppingCartOutlined />} onClick={() => setBuyModal(t)}>
              购买
            </Button>
          ) : null}
        </Row>
        {t.status === 'completed' && t.buyerId && (
          <div style={{ fontSize: 11, color: '#52c41a', marginTop: 4 }}>
            ✅ {t.buyerId?.nickname || '买家'} 已购买
          </div>
        )}
      </Card>
    )
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}><ShoppingOutlined style={{ color: '#FF69B4' }} /> 交易市场</Title>
          <Text type="secondary">全服玩家交易平台，大额成交触发糖果节！</Text>
        </Col>
        <Col>
          <Statistic title="我的金币" value={user?.gold?.toLocaleString()} prefix={<GoldOutlined />} valueStyle={{ color: '#DAA520' }} />
        </Col>
      </Row>

      <Card className="candy-card" bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={tab}
          onChange={(k) => { setTab(k); setPage(1) }}
          size="large"
          items={[
            {
              key: 'market',
              label: <span><ShopOutlined /> 全服市场 ({total})</span>,
              children: (
                <div style={{ padding: 24 }}>
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col>
                      <Select placeholder="物品类型" allowClear value={itemFilter} onChange={setItemFilter} style={{ width: 140 }}>
                        <Option value="candy">🍬 糖果</Option>
                        <Option value="recipe">📜 配方</Option>
                      </Select>
                    </Col>
                    {itemFilter === 'candy' && (
                      <Col>
                        <Select placeholder="品质筛选" allowClear value={qualityFilter} onChange={setQualityFilter} style={{ width: 140 }}>
                          {Object.entries(QUALITY_NAMES).map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
                        </Select>
                      </Col>
                    )}
                    <Col>
                      <Select value={sortBy} onChange={setSortBy} style={{ width: 140 }}>
                        <Option value="newest">最新上架</Option>
                        <Option value="price">价格从低</Option>
                        <Option value="rarity">价格从高</Option>
                      </Select>
                    </Col>
                  </Row>

                  {listings.length ? (
                    <Row gutter={[12, 12]}>
                      {listings.map((t: any) => (
                        <Col xs={24} sm={12} md={8} xl={6} key={t._id}>
                          {renderTradeCard(t)}
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty description="暂无商品" />
                  )}

                  {total > 12 && (
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                      <Button onClick={() => setPage(page + 1)}>加载更多</Button>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'sell',
              label: <span><DollarOutlined /> 我的交易</span>,
              children: (
                <div style={{ padding: 24 }}>
                  <Tabs
                    size="small"
                    items={[
                      {
                        key: 'new',
                        label: <span><TagOutlined /> 上架新商品</span>,
                        children: (
                          <div style={{ padding: 12 }}>
                            <Card title="🍬 我的成品糖果（可上架）" className="candy-card" style={{ marginBottom: 16 }} size="small">
                              {myCandies.length ? (
                                <Row gutter={[8, 8]}>
                                  {myCandies.map((c: any) => (
                                    <Col xs={24} sm={12} md={8} lg={6} key={c._id}>
                                      <Card size="small" hoverable
                                        extra={<Button size="small" type="primary" onClick={() => openListModal(c, 'candy')}>上架</Button>}
                                        style={{ borderLeft: `3px solid ${QUALITY_COLORS[c.quality]}` }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <Avatar size={28} style={{ background: c.color }}>{c.icon}</Avatar>
                                          <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                                            <Tag color={QUALITY_COLORS[c.quality]} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                                              {QUALITY_NAMES[c.quality]} · {c.rarityScore}
                                            </Tag>
                                          </div>
                                        </div>
                                      </Card>
                                    </Col>
                                  ))}
                                </Row>
                              ) : <Empty description="没有可上架的糖果" />}
                            </Card>
                            <Card title="📜 我的配方（可上架）" className="candy-card" size="small">
                              {myRecipes.filter((r: any) => r.status === 'approved' && (r.creatorId?._id === user?.id || r.creatorId === user?.id)).length ? (
                                <Row gutter={[8, 8]}>
                                  {myRecipes
                                    .filter((r: any) => r.status === 'approved' && (r.creatorId?._id === user?.id || r.creatorId === user?.id))
                                    .map((r: any) => (
                                      <Col xs={24} sm={12} md={8} lg={6} key={r._id}>
                                        <Card size="small" hoverable
                                          extra={<Button size="small" type="primary" onClick={() => openListModal(r, 'recipe')}>上架</Button>}
                                          style={{ borderLeft: '3px solid #722ed1' }}
                                        >
                                          <div style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</div>
                                          <Tag color={QUALITY_COLORS[r.targetQuality]} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                                            {QUALITY_NAMES[r.targetQuality]} · 难度 {r.difficulty}
                                          </Tag>
                                        </Card>
                                      </Col>
                                    ))}
                                </Row>
                              ) : <Empty description="没有可上架的配方" />}
                            </Card>
                          </div>
                        ),
                      },
                      {
                        key: 'selling',
                        label: <span>🆙 我出售的 ({mySales.length})</span>,
                        children: (
                          <div style={{ padding: 12 }}>
                            {mySales.length ? (
                              <Row gutter={[12, 12]}>
                                {mySales.map((t: any) => (
                                  <Col xs={24} sm={12} md={8} key={t._id}>{renderTradeCard(t, true)}</Col>
                                ))}
                              </Row>
                            ) : <Empty description="暂无出售记录" />}
                          </div>
                        ),
                      },
                      {
                        key: 'bought',
                        label: <span><ShoppingCartOutlined /> 我购买的 ({myPurchases.length})</span>,
                        children: (
                          <div style={{ padding: 12 }}>
                            {myPurchases.length ? (
                              <Row gutter={[12, 12]}>
                                {myPurchases.map((t: any) => (
                                  <Col xs={24} sm={12} md={8} key={t._id}>{renderTradeCard(t)}</Col>
                                ))}
                              </Row>
                            ) : <Empty description="暂无购买记录" />}
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="📝 商品上架"
        open={listModal.open}
        onCancel={() => setListModal({ open: false, item: null, itemType: '' })}
        footer={null}
        width={520}
        destroyOnClose
      >
        {listModal.item && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Card.Meta
                avatar={<Avatar size={48} style={{
                  background: listModal.itemType === 'candy' ? (listModal.item as any).color : 'linear-gradient(135deg, #f093fb, #4facfe)',
                  fontSize: 26,
                }}>
                  {listModal.itemType === 'candy' ? (listModal.item as any).icon : '📜'}
                </Avatar>}
                title={
                  <div>
                    {(listModal.item as any).name}
                    {listModal.itemType === 'candy' && (
                      <Tag color={QUALITY_COLORS[(listModal.item as any).quality]} style={{ marginLeft: 6 }}>
                        {QUALITY_NAMES[(listModal.item as any).quality]}
                      </Tag>
                    )}
                    {listModal.itemType === 'recipe' && (
                      <Tag color={QUALITY_COLORS[(listModal.item as any).targetQuality]} style={{ marginLeft: 6 }}>
                        {QUALITY_NAMES[(listModal.item as any).targetQuality]}
                      </Tag>
                    )}
                  </div>
                }
                description={
                  listModal.itemType === 'candy' ? (
                    <div>
                      稀有度：<b>{(listModal.item as any).rarityScore}</b> · 甜度：<b>{(listModal.item as any).sweetness}</b> · 魔力：<b>{(listModal.item as any).magicDuration}s</b>
                      <div>
                        {(listModal.item as any).affixes?.map((a: string) => <Tag key={a} className="affix-tag" style={{ fontSize: 11 }}>{AFFIX_NAMES[a]}</Tag>)}
                        {(listModal.item as any).specialEffects?.map((e: string) => <Tag key={e} className="effect-tag" style={{ fontSize: 11 }}>{EFFECT_NAMES[e]}</Tag>)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      难度：<b>{(listModal.item as any).difficulty}</b> · 成功率：<b>{((listModal.item as any).successRate * 100).toFixed(1)}%</b>
                    </div>
                  )
                }
              />
            </Card>

            {priceSuggest && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={
                  <Space>
                    <span>近7日均价：<b style={{ color: '#FF8C00' }}>{priceSuggest.average7d.toLocaleString()}</b> 金币</span>
                    <span>建议区间：</span>
                    <Tag color="green">{priceSuggest.suggestedMin.toLocaleString()}</Tag>
                    ~
                    <Tag color="magenta">{priceSuggest.suggestedMax.toLocaleString()}</Tag>
                    {priceSuggest.dataPoints === 0 && <Text type="secondary">（无历史数据，仅供参考）</Text>}
                  </Space>
                }
              />
            )}

            <Form form={form} layout="vertical" onFinish={handleList}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="quantity" label="出售数量" rules={[{ required: true }]} initialValue={1}>
                    <InputNumber min={1} max={(listModal.item as any).quantity || 999} size="large" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="askingPrice" label="单价（金币）" rules={[{ required: true }]}>
                    <InputNumber min={1} size="large" style={{ width: '100%' }} addonAfter="💰" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.askingPrice !== curr.askingPrice || prev.quantity !== curr.quantity}>
                {({ getFieldValue }) => {
                  const price = getFieldValue('askingPrice') || 0
                  const qty = getFieldValue('quantity') || 0
                  const fee = Math.round(price * qty * 0.05)
                  return (
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <Row>
                        <Col span={12}><Text type="secondary">总售价：</Text><b style={{ color: '#FF8C00' }}>{(price * qty).toLocaleString()} 💰</b></Col>
                        <Col span={12}><Text type="secondary">手续费 5%：</Text><b>{fee.toLocaleString()} 💰</b></Col>
                      </Row>
                      <Row style={{ marginTop: 4 }}>
                        <Col span={24}><Text type="secondary">实际到账：</Text><b style={{ color: '#52c41a' }}>{(price * qty - fee).toLocaleString()} 💰</b></Col>
                      </Row>
                      {price >= 10000 && (
                        <Tag color="gold" style={{ marginTop: 8 }}>🎉 大额成交有概率触发全服糖果节！</Tag>
                      )}
                    </Card>
                  )
                }}
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" icon={<RiseOutlined />}>
                确认上架
              </Button>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title="🛒 确认购买"
        open={!!buyModal}
        onCancel={() => setBuyModal(null)}
        footer={[
          <Button key="cancel" onClick={() => setBuyModal(null)}>取消</Button>,
          <Popconfirm
            key="ok"
            title="确认购买？"
            onConfirm={handleBuy}
            okText="确认购买"
            okButtonProps={{ type: 'primary' }}
          >
            <Button type="primary" icon={<ShoppingCartOutlined />}>立即购买</Button>
          </Popconfirm>,
        ]}
      >
        {buyModal && (
          <div>
            <Card size="small" style={{ marginBottom: 12 }}>
              <Card.Meta
                avatar={<Avatar size={56} style={{
                  background: buyModal.itemType === 'candy' ? (buyModal.candyId as any)?.color || '#FFB6C1' : 'linear-gradient(135deg, #f093fb, #4facfe)',
                  fontSize: 28,
                }}>
                  {buyModal.itemType === 'candy' ? (buyModal.candyId as any)?.icon || '🍬' : '📜'}
                </Avatar>}
                title={(buyModal.candyId || buyModal.recipeId as any)?.name || '商品'}
                description={`卖家：${buyModal.sellerId?.nickname || '未知'}`}
              />
            </Card>
            <Row gutter={12}>
              <Col span={12}><Card size="small"><Statistic title="售价" value={buyModal.askingPrice?.toLocaleString()} suffix="💰" /></Card></Col>
              <Col span={12}><Card size="small"><Statistic title="手续费 5%" value={Math.round((buyModal.askingPrice || 0) * 0.05)?.toLocaleString()} suffix="💰" /></Card></Col>
            </Row>
            <Card size="small" style={{ marginTop: 12 }}>
              <Statistic
                title="合计支付"
                value={(buyModal.askingPrice + Math.round((buyModal.askingPrice || 0) * 0.05)).toLocaleString()}
                suffix="💰"
                valueStyle={{ color: (user?.gold || 0) >= (buyModal.askingPrice + Math.round((buyModal.askingPrice || 0) * 0.05)) ? '#52c41a' : '#ff4d4f' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前金币：{user?.gold?.toLocaleString()} 💰
                {(user?.gold || 0) < (buyModal.askingPrice + Math.round((buyModal.askingPrice || 0) * 0.05)) && <Text type="danger">（余额不足）</Text>}
              </Text>
            </Card>
            {buyModal.askingPrice >= 10000 && (
              <Alert
                type="success"
                showIcon
                style={{ marginTop: 12 }}
                message="🎉 此为大额交易，有 15% 概率触发今日全服糖果节！"
                description="全服熬糖暴击率 +30%，持续到今日 24:00"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TradePage
