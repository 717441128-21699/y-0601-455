import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Button, Empty, Tag, Avatar, Statistic, Tooltip, List, Modal, InputNumber,
  message, Divider, Drawer, Typography, Space, Progress, Select
} from 'antd'
import {
  FireOutlined, PlusOutlined, MinusOutlined, ThunderboltOutlined, FileTextOutlined,
  DeleteOutlined, SendOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import request from '../utils/request'
import {
  QUALITY_NAMES, QUALITY_COLORS, MATERIAL_TYPE_NAMES, MATERIAL_TYPE_ICONS,
  EFFECT_NAMES, AFFIX_NAMES
} from '../utils/constants'

const { Title, Text } = Typography

interface IngredientSlot {
  materialId: string
  name: string
  quality: string
  type: string
  icon: string
  quantity: number
  maxAvailable: number
  order: number
}

const CandyPotPage = () => {
  const { user, workshop, festival, fetchUserInfo } = useAppStore()
  const [inventory, setInventory] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<IngredientSlot[]>([])
  const [result, setResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)
  const [cooking, setCooking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [recipes, setRecipes] = useState<any[]>([])
  const [recipeDrawer, setRecipeDrawer] = useState(false)
  const [filterType, setFilterType] = useState<string>()

  useEffect(() => {
    loadInventory()
    loadRecipes()
  }, [])

  const loadInventory = async () => {
    const inv: any = await request.get('/candy/materials')
    setInventory(inv.materials || [])
  }

  const loadRecipes = async () => {
    const res: any = await request.get('/candy/recipes/approved?limit=50')
    setRecipes(res.recipes || [])
  }

  const filteredInventory = filterType
    ? inventory.filter((m: any) => m.type === filterType)
    : inventory

  const addIngredient = (material: any) => {
    const existing = ingredients.find(i => i.materialId === material.materialId)
    if (existing) {
      if (existing.quantity < existing.maxAvailable) {
        existing.quantity += 1
        setIngredients([...ingredients])
      }
    } else {
      setIngredients([
        ...ingredients,
        {
          materialId: material.materialId,
          name: material.name,
          quality: material.quality,
          type: material.type,
          icon: material.icon,
          quantity: 1,
          maxAvailable: material.quantity,
          order: ingredients.length,
        },
      ])
    }
  }

  const updateQty = (idx: number, delta: number) => {
    const newList = [...ingredients]
    const item = newList[idx]
    item.quantity = Math.max(1, Math.min(item.maxAvailable, item.quantity + delta))
    setIngredients(newList)
  }

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx))
  }

  const applyRecipe = (recipe: any) => {
    const req = recipe.ingredients || []
    const slots: IngredientSlot[] = []
    let ok = true
    for (const reqIng of req) {
      const available = inventory.find((m: any) => m.materialId === reqIng.materialId.toString())
      if (!available || available.quantity < reqIng.minQuantity) {
        ok = false
        break
      }
      slots.push({
        materialId: reqIng.materialId.toString(),
        name: available.name,
        quality: available.quality,
        type: available.type,
        icon: available.icon,
        quantity: reqIng.minQuantity,
        maxAvailable: available.quantity,
        order: reqIng.order,
      })
    }
    if (!ok) {
      message.warning('原料不足，无法应用此配方')
      return
    }
    slots.sort((a, b) => a.order - b.order)
    setIngredients(slots)
    setRecipeDrawer(false)
    message.success('已应用配方，请检查后开始熬糖')
  }

  const startCooking = async () => {
    if (!ingredients.length) {
      message.warning('请先添加原料')
      return
    }
    if (!workshop) return
    setCooking(true)
    setProgress(0)
    const total = 60
    for (let i = 0; i <= total; i++) {
      await new Promise(r => setTimeout(r, 25))
      setProgress(Math.round((i / total) * 100))
    }
    try {
      const res: any = await request.post('/candy/candy/make', {
        workshopId: workshop._id,
        ingredients: ingredients.map(i => ({ materialId: i.materialId, quantity: i.quantity })),
      })
      setResult(res)
      setShowResult(true)
      fetchUserInfo()
      loadInventory()
    } catch (e) { /* ignore */ }
    finally {
      setCooking(false)
      setProgress(0)
      setIngredients([])
    }
  }

  return (
    <div>
      <Row gutter={[16, 16]} justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <FireOutlined style={{ color: '#FF69B4' }} /> 熬糖台
            {festival?.active && <Tag color="gold" style={{ marginLeft: 12 }}>暴击 +{(festival.critBonus * 100).toFixed(0)}%</Tag>}
          </Title>
          <Text type="secondary">按顺序搭配原料，赋予糖果独特魔力~</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<FileTextOutlined />} onClick={() => setRecipeDrawer(true)}>选择配方</Button>
            <Tooltip title={`品味 ${user?.skills?.taste} · 技巧 ${user?.skills?.technique} · 创意 ${user?.skills?.creativity}`}>
              <Tag color="magenta">当前技能加成</Tag>
            </Tooltip>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                🥘 熬糖台
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  熬糖台 Lv.{workshop?.stations?.candyPot?.level || 1}
                </Tag>
              </span>
            }
            className="candy-card"
            style={{ marginBottom: 16 }}
          >
            {cooking ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 64, animation: 'pulse 1s infinite' }}>🔥</div>
                <Title level={3} style={{ marginTop: 16 }} className="candy-gradient-text">
                  魔法熬制中...
                </Title>
                <Progress
                  percent={progress}
                  strokeColor={{ from: '#FF69B4', to: '#FFD700' }}
                  style={{ maxWidth: 500, margin: '24px auto' }}
                  size={['100%', 16]}
                />
                <Text type="secondary">请稍候，正在融合魔法能量...</Text>
              </div>
            ) : (
              <div>
                <div style={{ minHeight: 180, padding: 16, background: '#FFF5FB', borderRadius: 12, border: '2px dashed #FFB6C1' }}>
                  {ingredients.length === 0 ? (
                    <Empty description="从右侧选择原料，按顺序添加到这里" />
                  ) : (
                    <List
                      size="small"
                      dataSource={ingredients}
                      renderItem={(item, idx) => (
                        <List.Item
                          key={idx}
                          style={{ background: 'white', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}
                          actions={[
                            <Button size="small" shape="circle" icon={<MinusOutlined />} onClick={() => updateQty(idx, -1)} />,
                            <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>x{item.quantity}</span>,
                            <Button size="small" shape="circle" type="primary" icon={<PlusOutlined />} onClick={() => updateQty(idx, 1)} />,
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeIngredient(idx)} />,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<Tag color="magenta">#{idx + 1}</Tag>}
                            title={
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar size={28}>{item.icon}</Avatar>
                                <span>{item.name}</span>
                                <Tag color={QUALITY_COLORS[item.quality]}>{QUALITY_NAMES[item.quality]}</Tag>
                                <Tag>{MATERIAL_TYPE_ICONS[item.type]} {MATERIAL_TYPE_NAMES[item.type]}</Tag>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>
                <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Statistic title="已选原料种类" value={ingredients.length} suffix="种" />
                  </Col>
                  <Col span={12}>
                    <Statistic title="总原料数量" value={ingredients.reduce((s, i) => s + i.quantity, 0)} suffix="份" />
                  </Col>
                </Row>
                <Divider />
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<ThunderboltOutlined />}
                  disabled={!ingredients.length}
                  onClick={startCooking}
                  style={{ height: 52, fontSize: 18 }}
                >
                  🔥 开始熬糖！
                </Button>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <span>📦 原料库（{inventory.reduce((s: number, m: any) => s + m.quantity, 0)} 份）</span>
            }
            className="candy-card"
            extra={
              <Select
                size="small"
                placeholder="筛选类型"
                allowClear
                value={filterType}
                onChange={setFilterType}
                style={{ width: 140 }}
                options={Object.entries(MATERIAL_TYPE_NAMES).map(([v, l]) => ({ label: `${MATERIAL_TYPE_ICONS[v]} ${l}`, value: v }))}
              />
            }
          >
            <Button
              type="dashed"
              block
              style={{ marginBottom: 12 }}
              onClick={async () => {
                const res: any = await request.post('/candy/materials/collect', { count: 5 })
                if (res.success) {
                  message.success(`采集到 ${res.collected.length} 种原料！`)
                  loadInventory()
                }
              }}
            >
              🌿 外出采集 5 份随机原料
            </Button>
            {filteredInventory.length ? (
              <List
                size="small"
                dataSource={filteredInventory}
                renderItem={(m: any) => (
                  <List.Item
                    style={{ borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                    onClick={() => addIngredient(m)}
                    className="candy-card"
                  >
                    <List.Item.Meta
                      avatar={<Avatar size={36}>{m.icon}</Avatar>}
                      title={
                        <div>
                          {m.name}
                          <Tag color={QUALITY_COLORS[m.quality]} style={{ marginLeft: 6, fontSize: 11 }}>
                            {QUALITY_NAMES[m.quality]}
                          </Tag>
                        </div>
                      }
                      description={<span style={{ fontSize: 11 }}>{MATERIAL_TYPE_ICONS[m.type]} {MATERIAL_TYPE_NAMES[m.type]}</span>}
                    />
                    <Tag color="magenta">x{m.quantity}</Tag>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="背包空空，快去采集原料吧！" />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={result?.success ? (result.critHit ? '✨ 暴击成功！' : '🍬 熬糖成功') : '😭 熬糖失败'}
        open={showResult}
        onCancel={() => setShowResult(false)}
        footer={[
          <Button type="primary" key="ok" onClick={() => setShowResult(false)}>太棒了！</Button>
        ]}
        width={640}
      >
        {result?.success && result.candy ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 80 }}>{result.candy.icon}</div>
            <Title level={3} style={{ margin: '8px 0' }} className="quality-legendary">{result.candy.name}</Title>
            <Space wrap style={{ justifyContent: 'center' }}>
              <Tag color={QUALITY_COLORS[result.candy.quality]} style={{ fontSize: 14, padding: '4px 12px' }}>
                {QUALITY_NAMES[result.candy.quality]}
              </Tag>
              {result.critHit && <Tag className="crit-badge">暴击 x{result.candy.quantity}!</Tag>}
            </Space>
            <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
              <Col span={8}>
                <Card size="small"><Statistic title="甜度" value={result.stats?.sweetness} /></Card>
              </Col>
              <Col span={8}>
                <Card size="small"><Statistic title="魔力持续" value={result.stats?.magicDuration} suffix="s" /></Card>
              </Col>
              <Col span={8}>
                <Card size="small"><Statistic title="稀有度" value={result.stats?.rarityScore} /></Card>
              </Col>
            </Row>
            <Divider>特殊属性</Divider>
            {result.affixes?.length ? (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">词缀：</Text>
                {result.affixes.map((a: string) => (
                  <Tag key={a} className="affix-tag">{AFFIX_NAMES[a] || a}</Tag>
                ))}
              </div>
            ) : null}
            {result.specialEffects?.length ? (
              <div>
                <Text type="secondary">特殊效果：</Text>
                {result.specialEffects.map((e: string) => (
                  <Tag key={e} className="effect-tag">{EFFECT_NAMES[e] || e}</Tag>
                ))}
              </div>
            ) : null}
          </div>
        ) : result?.success === false ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 80 }}>💨</div>
            <Title level={4}>熬糖失败了...</Title>
            <Text type="secondary">{result.message}</Text>
            {result.returnedMaterials?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <Text type="secondary">返还的原料：</Text>
                <div style={{ marginTop: 8 }}>
                  {result.returnedMaterials.map((m: any, i: number) => (
                    <Tag key={i} color="green">{m.name} x{m.quantity}</Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Drawer
        title="📜 选择已批准配方"
        width={560}
        open={recipeDrawer}
        onClose={() => setRecipeDrawer(false)}
      >
        {recipes.length ? (
          <List
            dataSource={recipes}
            renderItem={(r: any) => (
              <Card size="small" style={{ marginBottom: 12 }} className="candy-card"
                extra={
                  <Button type="primary" size="small" icon={<SendOutlined />} onClick={() => applyRecipe(r)}>
                    应用
                  </Button>
                }
              >
                <Card.Meta
                  title={
                    <div>
                      {r.name}
                      {r.isOfficial && <Tag color="gold">官方</Tag>}
                      <Tag color={QUALITY_COLORS[r.targetQuality]}>{QUALITY_NAMES[r.targetQuality]}</Tag>
                      <Tag>难度 {r.difficulty}</Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        需要：{r.ingredients?.map((ing: any) => `${ing.materialName} x${ing.minQuantity}~${ing.maxQuantity}`).join('、')}
                      </Text>
                    </div>
                  }
                />
              </Card>
            )}
          />
        ) : (
          <Empty description="暂无已批准的配方" />
        )}
      </Drawer>
    </div>
  )
}

export default CandyPotPage
