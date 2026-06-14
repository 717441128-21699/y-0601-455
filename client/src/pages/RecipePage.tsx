import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Form, Input, InputNumber, Select, Button, Modal, message, List, Tag, Avatar,
  Tabs, Empty, Tooltip, Divider, Typography, Space, Table, Popconfirm
} from 'antd'
import {
  FileTextOutlined, SearchOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined,
  RiseOutlined, FileProtectOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import request from '../utils/request'
import { QUALITY_NAMES, QUALITY_COLORS, APPRENTICE_RANK_NAMES, EFFECT_NAMES } from '../utils/constants'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

const RecipePage = () => {
  const { user, fetchUserInfo } = useAppStore()
  const [tab, setTab] = useState('approved')
  const [developModal, setDevelopModal] = useState(false)
  const [reviewModal, setReviewModal] = useState<any>(null)
  const [promoteModal, setPromoteModal] = useState(false)
  const [form] = Form.useForm()
  const [reviewForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const [approvedList, setApprovedList] = useState<any[]>([])
  const [pendingList, setPendingList] = useState<any[]>([])
  const [materialsCatalog, setMaterialsCatalog] = useState<any[]>([])
  const [ingredientSlots, setIngredientSlots] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [tab])

  useEffect(() => {
    if (developModal) loadCatalog()
  }, [developModal])

  const loadData = async () => {
    try {
      if (tab === 'approved') {
        const res: any = await request.get('/candy/recipes/approved?limit=50')
        setApprovedList(res.recipes || [])
      }
      if (tab === 'pending' && user?.isChief) {
        const res: any = await request.get('/candy/recipes/pending?limit=50')
        setPendingList(res.recipes || [])
      }
    } catch (e) {}
  }

  const loadCatalog = async () => {
    const res: any = await request.get('/candy/materials/catalog?limit=200')
    setMaterialsCatalog(res.materials || [])
  }

  const addSlot = () => {
    setIngredientSlots([...ingredientSlots, { materialId: '', minQuantity: 1, maxQuantity: 3, order: ingredientSlots.length }])
  }

  const removeSlot = (idx: number) => {
    setIngredientSlots(ingredientSlots.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })))
  }

  const updateSlot = (idx: number, key: string, value: any) => {
    const newSlots = [...ingredientSlots]
    newSlots[idx][key] = value
    setIngredientSlots(newSlots)
  }

  const handleDevelop = async (values: any) => {
    if (ingredientSlots.length === 0) {
      message.warning('请至少添加一种原料')
      return
    }
    const ingredients = ingredientSlots
      .filter(s => s.materialId)
      .map(s => {
        const mat = materialsCatalog.find((m: any) => m._id === s.materialId)
        return { ...s, materialName: mat?.name || '' }
      })
    if (ingredients.length === 0) return
    setLoading(true)
    try {
      const res: any = await request.post('/candy/recipe/develop', {
        ...values,
        ingredients,
      })
      if (res.success) {
        message.success(res.message)
        setDevelopModal(false)
        form.resetFields()
        setIngredientSlots([])
        fetchUserInfo()
        loadData()
      } else {
        message.warning(res.message)
        if (res.returnedMaterials?.length) {
          Modal.info({
            title: '研发失败',
            content: (
              <div>
                <p>{res.message}</p>
                <div>返还原料：{res.returnedMaterials.map((m: any) => `${m.name} x${m.quantity}`).join('、')}</div>
                <div>本次成功率：{(res.actualSuccessRate * 100).toFixed(1)}%</div>
              </div>
            ),
          })
        }
      }
    } finally { setLoading(false) }
  }

  const handleReview = async (approve: boolean) => {
    if (!reviewModal) return
    const values = await reviewForm.validateFields()
    const res: any = await request.post(`/candy/recipe/${reviewModal._id}/review`, { approve, note: values.note })
    if (res.success) {
      message.success(res.message)
      setReviewModal(null)
      reviewForm.resetFields()
      loadData()
    }
  }

  const handlePromote = async (targetRank: string) => {
    const res: any = await request.post('/candy/apprentice/promote', { targetRank })
    if (res.success) {
      message.success(res.message)
      if (!res.requiresApproval) fetchUserInfo()
    }
    setPromoteModal(false)
  }

  const currentRankIdx = ['novice', 'apprentice', 'journeyman', 'expert', 'master'].indexOf(user?.apprenticeRank || 'novice')
  const nextRank = ['novice', 'apprentice', 'journeyman', 'expert', 'master'][Math.min(currentRankIdx + 1, 4)]

  const columns = [
    { title: '配方名称', dataIndex: 'name', key: 'name' },
    {
      title: '目标品质', dataIndex: 'targetQuality', key: 'targetQuality',
      render: (q: string) => <Tag color={QUALITY_COLORS[q]}>{QUALITY_NAMES[q]}</Tag>,
    },
    { title: '难度', dataIndex: 'difficulty', key: 'difficulty', render: (d: number) => <Tag color="magenta">Lv.{d}</Tag> },
    { title: '作者', dataIndex: ['creatorId', 'nickname'], key: 'author', render: (n: string) => n || '-' },
    {
      title: '提交时间', key: 'time', render: (_: any, r: any) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(r.submittedAt).format('YYYY-MM-DD HH:mm')}</Text>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <FileTextOutlined style={{ color: '#FF69B4' }} /> 配方研发
          </Title>
          <Text type="secondary">研发独特配方，成为传奇调糖师！</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<RiseOutlined />} onClick={() => setPromoteModal(true)}>
              晋升 {APPRENTICE_RANK_NAMES[user?.apprenticeRank || 'novice']} → {APPRENTICE_RANK_NAMES[nextRank]}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setDevelopModal(true); setIngredientSlots([]); form.resetFields() }}>
              研发新配方
            </Button>
          </Space>
        </Col>
      </Row>

      <Card className="candy-card" bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          size="large"
          items={[
            {
              key: 'approved',
              label: <span><CheckCircleOutlined /> 已批准配方 ({approvedList.length})</span>,
              children: (
                <div style={{ padding: 24 }}>
                  {approvedList.length ? (
                    <Table
                      dataSource={approvedList}
                      rowKey="_id"
                      pagination={false}
                      columns={[
                        ...columns,
                        {
                          title: '成功率', dataIndex: 'successRate', key: 'successRate',
                          render: (s: number) => `${(s * 100).toFixed(1)}%`,
                        },
                        {
                          title: '可能效果', dataIndex: 'possibleEffects', key: 'effects',
                          render: (arr: string[]) => arr?.length ? arr.map(e => <Tag key={e} className="effect-tag">{EFFECT_NAMES[e]}</Tag>) : '-',
                        },
                      ]}
                    />
                  ) : <Empty description="暂无已批准的配方" />}
                </div>
              ),
            },
            ...(user?.isChief ? [{
              key: 'pending',
              label: <span><FileProtectOutlined /> 待审批 ({pendingList.length})</span>,
              children: (
                <div style={{ padding: 24 }}>
                  {pendingList.length ? (
                    <Table
                      dataSource={pendingList}
                      rowKey="_id"
                      pagination={false}
                      columns={[
                        ...columns,
                        {
                          title: '操作', key: 'action',
                          render: (_: any, r: any) => (
                            <Space>
                              <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => setReviewModal(r)}>
                                审批
                              </Button>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  ) : <Empty description="暂无待审批配方" />}
                </div>
              ),
            }] : []),
          ]}
        />
      </Card>

      <Modal
        title={
          <span><PlusOutlined style={{ color: '#FF69B4' }} /> 研发新配方</span>
        }
        open={developModal}
        onCancel={() => setDevelopModal(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleDevelop}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="配方名称" rules={[{ required: true }]}>
                <Input placeholder="为你的配方起个好名字" size="large" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="targetQuality" label="目标品质" rules={[{ required: true }]} initialValue="common">
                <Select size="large">
                  {Object.entries(QUALITY_NAMES).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="difficulty" label="难度等级" rules={[{ required: true }]} initialValue={1}>
                <InputNumber min={1} max={10} size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="baseSweetness" label="基础甜度" rules={[{ required: true }]} initialValue={50}>
                <InputNumber min={0} size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="baseMagicDuration" label="基础魔力持续" rules={[{ required: true }]} initialValue={30}>
                <InputNumber min={0} size="large" style={{ width: '100%' }} addonAfter="秒" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="possibleEffects" label="可能特效（可多选）">
                <Select mode="multiple" size="large" allowClear>
                  {Object.entries(EFFECT_NAMES).map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="配方描述">
            <TextArea rows={2} placeholder="描述你的创意" showCount maxLength={200} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="paperCost" label="消耗试糖纸" rules={[{ required: true }]} initialValue={1}>
                <InputNumber min={1} size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dewCost" label="消耗稀有蜜露" rules={[{ required: true }]} initialValue={0}>
                <InputNumber min={0} size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">原料搭配（按顺序）</Divider>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {ingredientSlots.map((slot, idx) => (
              <Row key={idx} gutter={8} align="middle">
                <Col><Tag color="magenta">#{idx + 1}</Tag></Col>
                <Col flex="auto">
                  <Select
                    showSearch
                    placeholder="选择原料"
                    optionFilterProp="children"
                    value={slot.materialId || undefined}
                    onChange={(v) => updateSlot(idx, 'materialId', v)}
                    style={{ width: '100%' }}
                    size="large"
                    filterOption={(input, option: any) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {materialsCatalog.map((m: any) => (
                      <Option key={m._id} value={m._id}>
                        {m.icon} {m.name} <Tag color={QUALITY_COLORS[m.quality]}>{QUALITY_NAMES[m.quality]}</Tag>
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col style={{ width: 120 }}>
                  <InputNumber
                    min={1}
                    placeholder="最少"
                    value={slot.minQuantity}
                    onChange={(v) => updateSlot(idx, 'minQuantity', v)}
                    size="large"
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col style={{ width: 120 }}>
                  <InputNumber
                    min={1}
                    placeholder="最多"
                    value={slot.maxQuantity}
                    onChange={(v) => updateSlot(idx, 'maxQuantity', v)}
                    size="large"
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col>
                  <Button danger size="large" icon={<CloseCircleOutlined />} onClick={() => removeSlot(idx)} />
                </Col>
              </Row>
            ))}
          </Space>
          <Button block style={{ marginTop: 12 }} type="dashed" icon={<PlusOutlined />} onClick={addSlot}>
            添加原料（按添加顺序决定熬糖顺序）
          </Button>
          <Divider />
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            🔬 开始研发（消耗对应材料）
          </Button>
          <Paragraph type="secondary" style={{ textAlign: 'center', fontSize: 12, marginTop: 8 }}>
            成功率受熟练度、装饰台等级和创意技能影响；失败将返还40%原料
          </Paragraph>
        </Form>
      </Modal>

      <Modal
        title="审批配方"
        open={!!reviewModal}
        onCancel={() => setReviewModal(null)}
        footer={[
          <Popconfirm
            key="reject"
            title="确定驳回该配方？"
            onConfirm={() => { reviewForm.submit(); setTimeout(() => handleReview(false), 50) }}
            okText="驳回"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<CloseCircleOutlined />}>驳回</Button>
          </Popconfirm>,
          <Popconfirm
            key="approve"
            title="确定通过该配方？"
            onConfirm={() => { reviewForm.submit(); setTimeout(() => handleReview(true), 50) }}
            okText="通过"
            okButtonProps={{ type: 'primary' }}
          >
            <Button type="primary" icon={<CheckCircleOutlined />}>通过</Button>
          </Popconfirm>,
        ]}
      >
        {reviewModal && (
          <div>
            <Title level={4}>{reviewModal.name}</Title>
            <Tag color={QUALITY_COLORS[reviewModal.targetQuality]}>{QUALITY_NAMES[reviewModal.targetQuality]}</Tag>
            <Tag>难度 {reviewModal.difficulty}</Tag>
            <Paragraph style={{ marginTop: 8 }}>{reviewModal.description || '（无描述）'}</Paragraph>
            <Text type="secondary">提交者：{reviewModal.creatorId?.nickname || '-'}</Text>
            <Divider />
            <Form form={reviewForm} layout="vertical">
              <Form.Item name="note" label="审批备注" rules={[{ required: true, message: '请输入审批意见' }]}>
                <TextArea rows={3} placeholder="请输入审批意见..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title="🧑‍🍳 调糖师晋升"
        open={promoteModal}
        onCancel={() => setPromoteModal(false)}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎖️</div>
          <div style={{ fontSize: 18 }}>
            当前等级：<Tag color="magenta">{APPRENTICE_RANK_NAMES[user?.apprenticeRank || 'novice']}</Tag>
          </div>
          <Divider plain>下一等级</Divider>
          {currentRankIdx >= 4 ? (
            <div>
              <Title level={4} className="quality-legendary">您已是大师调糖师！</Title>
              <Text type="secondary">无需再晋升，您是最顶尖的存在~</Text>
            </div>
          ) : (
            <div>
              <Title level={4} style={{ color: '#722ed1', marginBottom: 16 }}>
                → {APPRENTICE_RANK_NAMES[nextRank]}
              </Title>
              <List
                size="small"
                dataSource={[
                  { label: '等级要求', value: [5, 15, 30, 50, 99][currentRankIdx + 1] },
                  { label: '经验要求', value: [500, 3000, 15000, 80000, 999999][currentRankIdx + 1] },
                  { label: '糖果数量', value: [20, 100, 500, 2000, 99999][currentRankIdx + 1] },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <Text type="secondary">{item.label}</Text>
                    <b>{item.value?.toLocaleString()}</b>
                  </List.Item>
                )}
              />
              <Divider />
              <Button type="primary" size="large" block icon={<RiseOutlined />} onClick={() => handlePromote(nextRank)}>
                申请晋升
              </Button>
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>
                高级别晋升需首席调糖师审批
              </Paragraph>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default RecipePage
