import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Progress, List, Avatar, Tag, Button, Empty, Tooltip, Typography } from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  GiftOutlined,
  StarOutlined,
  RiseOutlined,
  TeamOutlined,
  BankOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import request from '../utils/request'
import { QUALITY_NAMES, QUALITY_COLORS, APPRENTICE_RANK_NAMES } from '../utils/constants'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const DashboardPage = () => {
  const { user, workshop, festival } = useAppStore()
  const navigate = useNavigate()
  const [contest, setContest] = useState<any>(null)
  const [recentCandies, setRecentCandies] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [history, setHistory] = useState<any>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [active, candies, lb, his] = await Promise.all([
        request.get('/contest/active').catch(() => ({})),
        request.get('/candy/candies/my?limit=5').catch(() => ({ candies: [] })),
        request.get('/report/leaderboard/collection?limit=5').catch(() => ({ entries: [] })),
        request.get('/report/my/history').catch(() => null),
      ])
      setContest((active as any).active || (active as any).upcoming)
      setRecentCandies((candies as any).candies || [])
      setLeaderboard((lb as any).entries || [])
      setHistory(his)
    } catch (e) {}
  }

  const skills = user?.skills || { taste: 0, technique: 0, creativity: 0 }
  const expProgress = Math.min(100, ((user?.level || 1) * 100) / ((user?.level || 1) * 1000 + 500) * 100)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }} className="candy-gradient-text">
          欢迎回来，{user?.nickname}！{festival?.active && <Tag color="gold" style={{ marginLeft: 12 }}>🎉 糖果节进行中</Tag>}
        </Title>
        <Text type="secondary">今天也要制作出美味又充满魔力的糖果哦~ 🍬</Text>
      </div>

      {festival?.active && (
        <Card
          className="festival-banner"
          style={{ marginBottom: 24, borderRadius: 12 }}
          bodyStyle={{ padding: 16 }}
        >
          <Row gutter={16} align="middle">
            <Col>
              <div style={{ fontSize: 36 }}>🎊</div>
            </Col>
            <Col flex="auto">
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>糖果节进行中！全服熬糖暴击率 +{(festival.critBonus * 100).toFixed(0)}%</div>
              <div>触发者：{festival.triggeredBy} · 今日限时有效</div>
            </Col>
            <Col>
              <Button type="primary" size="large" onClick={() => navigate('/candy-pot')}>
                立即去熬糖 <FireOutlined />
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="candy-card">
            <Statistic
              title={
                <span>
                  <StarOutlined style={{ color: '#DAA520' }} /> 收藏度
                </span>
              }
              value={user?.collectionScore || 0}
              valueStyle={{ color: '#DAA520' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="candy-card">
            <Statistic
              title={
                <span>
                  <TrophyOutlined style={{ color: '#FF69B4' }} /> 大赛积分
                </span>
              }
              value={user?.contestScore || 0}
              valueStyle={{ color: '#FF69B4' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="candy-card">
            <Statistic
              title={
                <span>
                  <TeamOutlined style={{ color: '#52c41a' }} /> 公会贡献
                </span>
              }
              value={user?.guildContribution || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="candy-card">
            <Statistic
              title={
                <span>
                  <BankOutlined style={{ color: '#722ed1' }} /> 金币余额
                </span>
              }
              value={user?.gold || 0}
              valueStyle={{ color: '#722ed1' }}
              suffix="💰"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={<span><FireOutlined style={{ color: '#FF69B4' }} /> 调糖师档案</span>} className="candy-card">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar size={64} style={{ background: 'linear-gradient(135deg, #FF69B4, #FF1493)', fontSize: 28 }}>{user?.avatar}</Avatar>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.nickname} {user?.isChief && '👑'}</div>
                    <Tag color="magenta">{APPRENTICE_RANK_NAMES[user?.apprenticeRank || 'novice']}</Tag>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>等级 Lv.{user?.level}</div>
                <Progress percent={expProgress} showInfo={false} strokeColor={{ from: '#FF69B4', to: '#FF1493' }} />
                <div style={{ fontSize: 12, color: '#999' }}>经验值：{user?.exp || 0}</div>
              </Col>
            </Row>
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>👅 品味</div>
                <Progress percent={skills.taste} strokeColor="#1890ff" size="small" />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>🔧 技巧</div>
                <Progress percent={skills.technique} strokeColor="#52c41a" size="small" />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>💡 创意</div>
                <Progress percent={skills.creativity} strokeColor="#722ed1" size="small" />
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Button block icon={<FireOutlined />} onClick={() => navigate('/candy-pot')}>
                  开始熬糖
                </Button>
              </Col>
              <Col span={12}>
                <Button block type="primary" icon={<TrophyOutlined />} onClick={() => navigate('/contest')}>
                  参加大赛
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <TrophyOutlined style={{ color: '#FA8C16' }} /> 今日甜点大赛
              </span>
            }
            extra={contest && <Button type="link" onClick={() => navigate('/contest')}>查看详情</Button>}
            className={contest?.status === 'ongoing' ? 'candy-card contest-live' : 'candy-card'}
          >
            {contest ? (
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{contest.title}</div>
                <Tag color={contest.status === 'ongoing' ? 'red' : contest.status === 'scheduled' ? 'gold' : 'default'}>
                  {contest.status === 'ongoing' ? '🔥 进行中' : contest.status === 'scheduled' ? '⏰ 即将开始' : '已结束'}
                </Tag>
                <Tag color="blue">主题：{contest.theme}</Tag>
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">参赛人数</Text>
                  <b style={{ margin: '0 8px' }}>{contest.participants?.length || 0}</b>
                  <Text type="secondary">/ {contest.maxParticipants}</Text>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">奖池：</Text>
                  <b style={{ color: '#DAA520' }}>{contest.prizePool?.toLocaleString() || 0} 金币</b>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">时间：</Text>
                  <Text>{dayjs(contest.startTime).format('HH:mm')} - {dayjs(contest.endTime).format('HH:mm')}</Text>
                </div>
                {contest.status !== 'completed' && (
                  <Button
                    type="primary"
                    block
                    size="large"
                    style={{ marginTop: 16 }}
                    icon={<ThunderboltOutlined />}
                    onClick={() => navigate('/contest')}
                  >
                    {contest.status === 'scheduled' ? '查看赛事' : '立即参赛 / 观战'}
                  </Button>
                )}
              </div>
            ) : (
              <Empty description="今日暂无大赛" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={<span><GiftOutlined style={{ color: '#FF69B4' }} /> 最近制作的糖果</span>}
            extra={<Button type="link" onClick={() => navigate('/inventory')}>查看全部</Button>}
            className="candy-card"
          >
            {recentCandies.length ? (
              <List
                dataSource={recentCandies}
                renderItem={(c: any) => (
                  <List.Item key={c._id}>
                    <List.Item.Meta
                      avatar={<Avatar size={48} style={{ background: c.color || '#FFB6C1', fontSize: 22 }}>{c.icon}</Avatar>}
                      title={
                        <div>
                          {c.name} {c.critHit && <Tag color="gold" className="crit-badge">暴击</Tag>}
                          {c.quality && <Tag color={QUALITY_COLORS[c.quality]}>{QUALITY_NAMES[c.quality]}</Tag>}
                        </div>
                      }
                      description={
                        <div>
                          {c.specialEffects?.length > 0 && c.specialEffects.map((e: string) => <Tag key={e} className="effect-tag">{e}</Tag>)}
                          {c.affixes?.length > 0 && c.affixes.map((a: string) => <Tag key={a} className="affix-tag">{a}</Tag>)}
                          <div style={{ marginTop: 4, fontSize: 12 }}>
                            甜度 {c.sweetness} · 魔力 {c.magicDuration}s · 稀有度 {c.rarityScore}
                          </div>
                        </div>
                      }
                    />
                    <Tooltip title="制作时间">
                      <Text type="secondary">{dayjs(c.createdAt).format('MM-DD HH:mm')}</Text>
                    </Tooltip>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="还没有制作糖果哦，去熬糖台试试吧！">
                <Button type="primary" onClick={() => navigate('/candy-pot')}>立即熬糖</Button>
              </Empty>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span><RiseOutlined style={{ color: '#DAA520' }} /> 收藏度排行榜 TOP5</span>}
            extra={<Button type="link" onClick={() => navigate('/leaderboard')}>完整榜单</Button>}
            className="candy-card"
          >
            {leaderboard.length ? (
              <List
                dataSource={leaderboard}
                renderItem={(p: any, i: number) => (
                  <List.Item key={p.id}>
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#FFE4EC',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', color: i < 3 ? 'white' : '#C71585', fontSize: 16,
                        }}>{i + 1}</div>
                      }
                      title={
                        <span style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${p.id}`)}>
                          {p.nickname} {p.level && <Tag>Lv.{p.level}</Tag>}
                        </span>
                      }
                      description={`收藏度：${p.score.toLocaleString()}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
