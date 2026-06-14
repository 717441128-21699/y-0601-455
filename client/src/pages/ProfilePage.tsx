import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Avatar, Tag, Progress, Typography, Statistic, List, Empty, Spin, Button
} from 'antd'
import {
  UserOutlined, HomeOutlined, FireOutlined, TrophyOutlined, StarOutlined,
  HeartOutlined, TeamOutlined, ArrowLeftOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import request from '../utils/request'
import {
  QUALITY_NAMES, QUALITY_COLORS, APPRENTICE_RANK_NAMES, WORKSHOP_STYLE_NAMES, STYLE_BG,
  EFFECT_NAMES, AFFIX_NAMES
} from '../utils/constants'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const ProfilePage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id])

  const load = async () => {
    setLoading(true)
    try {
      const res: any = await request.get(`/report/profile/${id}`)
      setProfile(res)
    } finally { setLoading(false) }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 120 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!profile) {
    return <Card><Empty description="玩家不存在" /><Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>返回</Button></Card>
  }

  const { player, workshop, recentRecords, recentCandies } = profile

  return (
    <div>
      <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
        返回
      </Button>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            className="candy-card"
            style={{ marginBottom: 16 }}
            bodyStyle={{
              padding: 32, textAlign: 'center',
              background: 'linear-gradient(135deg, #fff5fb 0%, #ffe8f1 100%)',
              borderRadius: 16,
            }}
          >
            <Avatar size={96} style={{
              background: 'linear-gradient(135deg, #FF69B4, #C71585)',
              fontSize: 44, border: '4px solid white', boxShadow: '0 4px 20px rgba(199,21,133,0.3)',
            }}>
              {player.avatar}
            </Avatar>
            <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>
              {player.nickname}
              {player.isChief && <Tag color="gold" style={{ marginLeft: 8 }}>👑 首席调糖师</Tag>}
            </Title>
            <Tag color="magenta" style={{ fontSize: 13, padding: '4px 12px' }}>
              {APPRENTICE_RANK_NAMES[player.apprenticeRank] || player.apprenticeRank}
            </Tag>
            <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px', marginLeft: 4 }}>
              Lv.{player.level}
            </Tag>

            <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
              <Col span={8}>
                <Statistic title="收藏度" value={player.collectionScore?.toLocaleString() || 0} valueStyle={{ color: '#DAA520', fontSize: 16 }} />
              </Col>
              <Col span={8}>
                <Statistic title="大赛积分" value={player.contestScore?.toLocaleString() || 0} valueStyle={{ color: '#FF69B4', fontSize: 16 }} />
              </Col>
              <Col span={8}>
                <Statistic title="公会贡献" value={player.guildContribution?.toLocaleString() || 0} valueStyle={{ color: '#52c41a', fontSize: 16 }} />
              </Col>
            </Row>
          </Card>

          <Card title={<span><FireOutlined style={{ color: '#FF69B4' }} /> 调糖师技能</span>} className="candy-card" style={{ marginBottom: 16 }}>
            <List size="small">
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>👅 品味</span><b>{player.skills?.taste || 0}/100</b>
                  </div>
                  <Progress percent={player.skills?.taste || 0} strokeColor="#1890ff" showInfo={false} />
                </div>
              </List.Item>
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>🔧 技巧</span><b>{player.skills?.technique || 0}/100</b>
                  </div>
                  <Progress percent={player.skills?.technique || 0} strokeColor="#52c41a" showInfo={false} />
                </div>
              </List.Item>
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>💡 创意</span><b>{player.skills?.creativity || 0}/100</b>
                  </div>
                  <Progress percent={player.skills?.creativity || 0} strokeColor="#722ed1" showInfo={false} />
                </div>
              </List.Item>
            </List>
          </Card>

          {workshop && (
            <Card
              title={<span><HomeOutlined style={{ color: '#722ed1' }} /> 工坊信息</span>}
              className="candy-card"
              bodyStyle={{ padding: 0, overflow: 'hidden' }}
            >
              <div style={{
                height: 100,
                background: STYLE_BG[workshop.style] || STYLE_BG.rainbow,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36 }}>🏠</div>
                  <div style={{ fontWeight: 600 }}>{workshop.name}</div>
                  <Tag color="white" style={{ fontSize: 11 }}>{WORKSHOP_STYLE_NAMES[workshop.style]}</Tag>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <Row gutter={[8, 8]}>
                  <Col span={12}><Statistic title="工坊等级" value={`Lv.${workshop.level}`} /></Col>
                  <Col span={12}><Statistic title="声望" value={workshop.reputation} /></Col>
                  <Col span={24}><Statistic title="累计制作糖果" value={workshop.totalCandiesMade} suffix="件" /></Col>
                </Row>
              </div>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={<span><StarOutlined style={{ color: '#FF69B4' }} /> 最近制作的糖果</span>}
            className="candy-card"
            style={{ marginBottom: 16 }}
          >
            {recentCandies?.length ? (
              <Row gutter={[12, 12]}>
                {recentCandies.map((c: any) => (
                  <Col xs={24} sm={12} lg={8} key={c._id}>
                    <Card
                      size="small"
                      className="candy-card"
                      style={{ borderLeft: `4px solid ${QUALITY_COLORS[c.quality]}` }}
                    >
                      <Card.Meta
                        avatar={<Avatar size={44} style={{ background: c.color, fontSize: 22 }}>{c.icon}</Avatar>}
                        title={
                          <div style={{ fontSize: 13 }}>
                            {c.name}
                            {c.critHit && <Tag className="crit-badge">暴击</Tag>}
                          </div>
                        }
                        description={
                          <div>
                            <Tag color={QUALITY_COLORS[c.quality]} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                              {QUALITY_NAMES[c.quality]}
                            </Tag>
                            <div style={{ marginTop: 4 }}>
                              {c.affixes?.map((a: string) => <Tag key={a} className="affix-tag" style={{ fontSize: 10 }}>{AFFIX_NAMES[a]}</Tag>)}
                              {c.specialEffects?.map((e: string) => <Tag key={e} className="effect-tag" style={{ fontSize: 10 }}>{EFFECT_NAMES[e]}</Tag>)}
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              甜度{c.sweetness} · 魔力{c.magicDuration}s · {dayjs(c.createdAt).format('MM-DD HH:mm')}
                            </Text>
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="暂无糖果" />
            )}
          </Card>

          <Card
            title={<span><FireOutlined style={{ color: '#FF69B4' }} /> 熬糖记录</span>}
            className="candy-card"
            style={{ marginBottom: 16 }}
          >
            {recentRecords?.length ? (
              <List
                size="small"
                dataSource={recentRecords}
                renderItem={(r: any, i: number) => {
                  const resultMap: Record<string, { tag: string; color: string; icon: string }> = {
                    success: { tag: '成功', color: 'green', icon: '✅' },
                    crit: { tag: '暴击成功', color: 'gold', icon: '✨' },
                    fail: { tag: '失败', color: 'red', icon: '💨' },
                  }
                  const info = resultMap[r.result] || resultMap.success
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Tag color={info.color}>{info.icon} #{i + 1}</Tag>}
                        title={
                          <div>
                            <Tag color={info.color}>{info.tag}</Tag>
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                              {dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            ) : (
              <Empty description="暂无熬糖记录" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ProfilePage
