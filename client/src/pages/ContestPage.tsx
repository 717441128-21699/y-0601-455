import { useState, useEffect, useRef } from 'react'
import {
  Row, Col, Card, Button, Empty, Avatar, Tag, Progress, Table, Modal, Select, message,
  Typography, Space, List, Statistic, Alert, Tooltip
} from 'antd'
import {
  TrophyOutlined, ThunderboltOutlined, StarOutlined, LikeOutlined, GiftOutlined,
  PlayCircleOutlined, TeamOutlined, ClockCircleOutlined, FireOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import request from '../utils/request'
import { getSocket } from '../utils/socket'
import { QUALITY_NAMES, QUALITY_COLORS, EFFECT_NAMES, AFFIX_NAMES } from '../utils/constants'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const ContestPage = () => {
  const { user, fetchUserInfo } = useAppStore()
  const [activeContest, setActiveContest] = useState<any>(null)
  const [myCandies, setMyCandies] = useState<any[]>([])
  const [submitModal, setSubmitModal] = useState(false)
  const [selectedCandy, setSelectedCandy] = useState<any>(null)
  const [liveData, setLiveData] = useState<any>({ participants: [], events: [], scoreHistory: [] })
  const [refreshLoading, setRefreshLoading] = useState(false)
  const contestRef = useRef<any>(null)
  const socketJoinedRef = useRef<string | null>(null)

  useEffect(() => {
    loadContest()
    const socket = getSocket()
    if (socket) {
      socket.on('contest_updated', (data: any) => {
        setLiveData((prev: any) => ({ ...prev, ...data }))
      })
      socket.on('skill_result', (res: any) => {
        if (res.success) message.success(res.message)
        else message.warning(res.message)
      })
      socket.on('contest_ended', () => {
        loadContest()
      })
    }
    return () => {
      if (socket) {
        socket.off('contest_updated')
        socket.off('skill_result')
        socket.off('contest_ended')
        if (socketJoinedRef.current) {
          socket.emit('leave_contest', socketJoinedRef.current)
          socketJoinedRef.current = null
        }
      }
    }
  }, [])

  useEffect(() => {
    contestRef.current = activeContest
    if (activeContest?._id) {
      loadFullContest()
      const socket = getSocket()
      if (socket && socketJoinedRef.current !== activeContest._id) {
        if (socketJoinedRef.current) {
          socket.emit('leave_contest', socketJoinedRef.current)
        }
        socket.emit('join_contest', activeContest._id)
        socketJoinedRef.current = activeContest._id
      }
    }
  }, [activeContest?._id])

  const loadContest = async () => {
    try {
      const res: any = await request.get('/contest/active')
      setActiveContest(res.active || res.upcoming)
      const c: any = await request.get('/candy/candies/my?limit=50')
      setMyCandies((c.candies || []).filter((x: any) => !x.inTrade))
    } catch (e) {}
  }

  const loadFullContest = async () => {
    try {
      const c: any = await request.get(`/contest/${activeContest._id}`)
      setLiveData((prev: any) => ({
        participants: c.participants || prev.participants,
        events: c.events || prev.events,
        scoreHistory: c.scoreHistory || prev.scoreHistory,
      }))
    } catch (e) {}
  }

  const manualRefresh = async () => {
    const socket = getSocket()
    if (socket && activeContest) {
      setRefreshLoading(true)
      socket.emit('contest_refresh', activeContest._id)
      await new Promise(r => setTimeout(r, 1500))
      await loadFullContest()
      setRefreshLoading(false)
    }
  }

  const submitEntry = async () => {
    if (!selectedCandy) return
    try {
      const res: any = await request.post(`/contest/${activeContest._id}/submit`, { candyId: selectedCandy._id })
      if (res.success) {
        message.success(res.message)
        setSubmitModal(false)
        setSelectedCandy(null)
        await loadFullContest()
        fetchUserInfo()
      } else {
        message.warning(res.message)
      }
    } catch (e) {}
  }

  const useSkill = async (type: 'sugar_boost' | 'decoration') => {
    const socket = getSocket()
    if (socket && activeContest) {
      socket.emit('contest_use_skill', { contestId: activeContest._id, skillType: type })
    }
  }

  const myParticipant = liveData.participants?.find((p: any) => p.playerId?._id?.toString() === user?.id || p.playerId?.toString() === user?.id)
  const isJoined = !!myParticipant

  const timeStatus = () => {
    if (!activeContest) return null
    const now = new Date()
    const start = new Date(activeContest.startTime)
    const end = new Date(activeContest.endTime)
    if (now < start) return { text: '即将开始', color: 'gold', time: dayjs(start).format('HH:mm') }
    if (now > end) return { text: '已结束', color: 'default', time: '-' }
    if (activeContest.status === 'completed') return { text: '已结束', color: 'default', time: '-' }
    return { text: '🔥 进行中', color: 'red', time: `截止 ${dayjs(end).format('HH:mm')}` }
  }

  const rankedParticipants = [...(liveData.participants || [])].sort((a, b) => b.totalScore - a.totalScore)
  const status = timeStatus()

  const columns = [
    {
      title: '排名', width: 64, key: 'rank', align: 'center' as const,
      render: (_: any, __: any, i: number) => {
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
        return i < 3 ? <div style={{
          width: 28, height: 28, borderRadius: '50%', background: colors[i],
          color: 'white', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{i + 1}</div> : <Text type="secondary">#{i + 1}</Text>
      },
    },
    {
      title: '选手', key: 'player',
      render: (_: any, p: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={36} style={{ background: 'linear-gradient(135deg, #FFB6C1, #FF69B4)' }}>
            {p.playerId?.avatar || '🍬'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {p.playerId?.nickname || '未知'}
              {p.playerId?._id?.toString() === user?.id && <Tag color="magenta" style={{ marginLeft: 4 }}>我</Tag>}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '评委分', width: 100, key: 'jury', align: 'center' as const,
      render: (_: any, p: any) => {
        const avg = p.juryScores?.length ? p.juryScores.reduce((s: number, x: number) => s + x, 0) / p.juryScores.length : 0
        return <b style={{ color: '#722ed1' }}>{avg.toFixed(1)}</b>
      },
    },
    {
      title: '观众喜爱', width: 100, key: 'audience', align: 'center' as const,
      render: (_: any, p: any) => <b style={{ color: '#52c41a' }}>❤️ {p.audienceLove || 0}</b>,
    },
    {
      title: '总分', width: 120, key: 'total', align: 'center' as const,
      render: (_: any, p: any) => (
        <Space direction="vertical" size={0}>
          <b style={{ fontSize: 18, color: '#FF69B4' }}>{p.totalScore || 0}</b>
          {p.rank && <Tag color="gold">第{p.rank}名</Tag>}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <TrophyOutlined style={{ color: '#FF69B4' }} /> 甜点大赛
          </Title>
          <Text type="secondary">每日开放，与全服调糖师一决高下！</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<PlayCircleOutlined />} onClick={manualRefresh} loading={refreshLoading}>
              刷新实时数据
            </Button>
          </Space>
        </Col>
      </Row>

      {activeContest ? (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={16}>
              <Card
                className={`candy-card ${activeContest.status === 'ongoing' ? 'contest-live' : ''}`}
                bodyStyle={{ padding: 20 }}
                style={{ borderRadius: 16 }}
              >
                <Row gutter={[16, 16]} align="middle">
                  <Col flex="none">
                    <div style={{ fontSize: 72 }}>🏆</div>
                  </Col>
                  <Col flex="auto">
                    <Title level={3} style={{ marginBottom: 4 }}>{activeContest.title}</Title>
                    <Space wrap>
                      <Tag color={status?.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                        {status?.text}
                      </Tag>
                      <Tag color="blue">主题：{activeContest.theme}</Tag>
                      <Tag color="purple">评委：{activeContest.jury?.length}人</Tag>
                    </Space>
                    <Paragraph type="secondary" style={{ margin: '8px 0' }}>
                      {activeContest.description}
                    </Paragraph>
                    <Space size={16}>
                      <span><TeamOutlined /> 参赛：<b>{liveData.participants?.length || 0} / {activeContest.maxParticipants}</b></span>
                      <span><ClockCircleOutlined /> {status?.time}</span>
                      <span><GiftOutlined /> 奖池：<b style={{ color: '#DAA520' }}>{(activeContest.prizePool || 0).toLocaleString()}💰</b></span>
                    </Space>
                  </Col>
                </Row>

                {activeContest.status !== 'completed' && (
                  <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
                    <Col xs={24} md={8}>
                      <Button
                        type="primary"
                        size="large"
                        block
                        icon={isJoined ? <GiftOutlined /> : <TrophyOutlined />}
                        disabled={isJoined}
                        onClick={() => setSubmitModal(true)}
                      >
                        {isJoined ? '✅ 已参赛' : '🎯 立即报名参赛'}
                      </Button>
                    </Col>
                    {isJoined && activeContest.status === 'ongoing' && (
                      <>
                        <Col xs={24} md={8}>
                          <Tooltip title="消耗魔法糖粉，提升观众喜爱值 (今日次数: 5)">
                            <Button
                              size="large"
                              block
                              icon={<LikeOutlined />}
                              onClick={() => useSkill('sugar_boost')}
                              style={{ background: '#52c41a', color: 'white', border: 'none' }}
                            >
                              撒糖粉 x{5 - (myParticipant?.boostCount || 0)}
                            </Button>
                          </Tooltip>
                        </Col>
                        <Col xs={24} md={8}>
                          <Tooltip title="消耗装饰包，提升评委好感 (今日次数: 3)">
                            <Button
                              size="large"
                              block
                              icon={<StarOutlined />}
                              onClick={() => useSkill('decoration')}
                              style={{ background: '#722ed1', color: 'white', border: 'none' }}
                            >
                              装饰 x{3 - (myParticipant?.decorationCount || 0)}
                            </Button>
                          </Tooltip>
                        </Col>
                      </>
                    )}
                  </Row>
                )}

                {activeContest.status === 'completed' && (
                  <Alert type="success" showIcon message="本次比赛已结束，感谢所有参赛选手！" style={{ marginTop: 16 }} />
                )}
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="👨‍🍳 评委团" className="candy-card">
                <List
                  size="small"
                  dataSource={activeContest.jury || []}
                  renderItem={(j: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar size={40} style={{ background: '#FFE4EC', fontSize: 22 }}>{j.avatar}</Avatar>}
                        title={j.name}
                        description={`严格度：${Math.round((j.strictness || 0) * 100)}%`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
              {myParticipant && (
                <Card title="📊 我的状态" className="candy-card" style={{ marginTop: 12 }}>
                  <Row gutter={[8, 8]}>
                    <Col span={12}><Statistic title="当前总分" value={myParticipant.totalScore} /></Col>
                    <Col span={12}>
                      <Statistic
                        title="当前排名"
                        value={rankedParticipants.findIndex((x: any) => x.playerId?._id?.toString() === user?.id || x.playerId?.toString() === user?.id) + 1}
                        suffix={`/${rankedParticipants.length}`}
                      />
                    </Col>
                    <Col span={12}><Statistic title="评委分" value={(myParticipant.juryScores?.reduce((s: number, v: number) => s + v, 0) / (myParticipant.juryScores?.length || 1)).toFixed(1)} /></Col>
                    <Col span={12}><Statistic title="观众" value={myParticipant.audienceLove} /></Col>
                  </Row>
                </Card>
              )}
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card title={<span><ThunderboltOutlined style={{ color: '#FF69B4' }} /> 实时排行榜</span>} className="candy-card">
                {rankedParticipants.length ? (
                  <Table
                    dataSource={rankedParticipants}
                    rowKey={(p) => p.playerId?._id || p.playerId}
                    pagination={false}
                    size="middle"
                    columns={columns}
                  />
                ) : (
                  <Empty description="暂无参赛选手" />
                )}
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="📢 实时事件" className="candy-card" bodyStyle={{ padding: 12, maxHeight: 600, overflowY: 'auto' }}>
                <List
                  size="small"
                  dataSource={[...(liveData.events || [])].reverse().slice(0, 50)}
                  locale={{ emptyText: '暂无事件' }}
                  renderItem={(e: any) => (
                    <List.Item style={{ padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                          {dayjs(e.timestamp).format('HH:mm:ss')}
                        </div>
                        <Text style={{ fontSize: 13 }}>{e.message}</Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </div>
      ) : (
        <Card className="candy-card">
          <Empty description="今日大赛暂未开启，稍后再来看看吧~">
            <Button onClick={() => request.get('/contest/daily/create').then(r => loadContest())}>
              手动生成今日大赛（测试用）
            </Button>
          </Empty>
        </Card>
      )}

      <Modal
        title="🎯 选择参赛糖果"
        open={submitModal}
        onCancel={() => setSubmitModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setSubmitModal(false)}>取消</Button>,
          <Button key="ok" type="primary" icon={<FireOutlined />} disabled={!selectedCandy} onClick={submitEntry}>
            提交参赛
          </Button>,
        ]}
        width={720}
      >
        {myCandies.length ? (
          <Select
            style={{ width: '100%' }}
            placeholder="选择你最满意的糖果作品"
            size="large"
            value={selectedCandy?._id}
            onChange={(v) => setSelectedCandy(myCandies.find((c: any) => c._id === v))}
            optionLabelProp="label"
            listHeight={400}
            optionRender={(opt: any) => {
              const c = myCandies.find((x: any) => x._id === opt.value)
              if (!c) return null
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 4 }}>
                  <Avatar size={40} style={{ background: c.color, fontSize: 22 }}>{c.icon}</Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {c.name} {c.critHit && <Tag className="crit-badge">暴击</Tag>}
                    </div>
                    <div>
                      <Tag color={QUALITY_COLORS[c.quality]}>{QUALITY_NAMES[c.quality]}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        稀有度 {c.rarityScore} · 甜度 {c.sweetness} · 魔力 {c.magicDuration}s
                      </Text>
                    </div>
                  </div>
                </div>
              )
            }}
          >
            {myCandies.map((c: any) => (
              <Option key={c._id} value={c._id} label={`${c.name} (稀有度 ${c.rarityScore})`}>
                {c.name}
              </Option>
            ))}
          </Select>
        ) : (
          <Empty description="你还没有制作糖果哦，先去熬糖台吧！" />
        )}

        {selectedCandy && (
          <Card style={{ marginTop: 16 }}>
            <Card.Meta
              avatar={<Avatar size={64} style={{ background: selectedCandy.color, fontSize: 36 }}>{selectedCandy.icon}</Avatar>}
              title={
                <div>
                  <span style={{ fontSize: 18 }}>{selectedCandy.name}</span>
                  <Tag color={QUALITY_COLORS[selectedCandy.quality]} style={{ marginLeft: 8 }}>{QUALITY_NAMES[selectedCandy.quality]}</Tag>
                  {selectedCandy.critHit && <Tag className="crit-badge">暴击</Tag>}
                </div>
              }
              description={
                <div style={{ marginTop: 8 }}>
                  <Space size={8} wrap>
                    {selectedCandy.affixes?.map((a: string) => <Tag key={a} className="affix-tag">{AFFIX_NAMES[a]}</Tag>)}
                    {selectedCandy.specialEffects?.map((e: string) => <Tag key={e} className="effect-tag">{EFFECT_NAMES[e]}</Tag>)}
                  </Space>
                  <Progress
                    percent={Math.min(100, selectedCandy.rarityScore / 20)}
                    strokeColor={{ from: '#FF69B4', to: '#FFD700' }}
                    style={{ marginTop: 12 }}
                    format={(p) => `竞争力评分 ${selectedCandy.contestValue}`}
                  />
                </div>
              }
            />
          </Card>
        )}
      </Modal>
    </div>
  )
}

export default ContestPage
