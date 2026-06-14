import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Tabs, Avatar, List, Tag, Typography, Button, Input, Table, Empty, Space, Tooltip
} from 'antd'
import {
  CrownOutlined, StarOutlined, TrophyOutlined, TeamOutlined, SearchOutlined,
  UserOutlined, HeartOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import request from '../utils/request'
import { APPRENTICE_RANK_NAMES } from '../utils/constants'

const { Title, Text } = Typography
const { Search } = Input

const LeaderboardPage = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState('collection')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [tab])

  const load = async () => {
    setLoading(true)
    try {
      const map: Record<string, string> = {
        collection: 'collection',
        contest: 'contest',
        guildContribution: 'guild-contribution',
        guild: 'guild',
      }
      const res: any = await request.get(`/report/leaderboard/${map[tab]}?limit=100`)
      setData(res.entries || [])
    } finally { setLoading(false) }
  }

  const getMedalColor = (i: number) => {
    if (i === 0) return 'linear-gradient(135deg, #FFD700, #FFA500)'
    if (i === 1) return 'linear-gradient(135deg, #C0C0C0, #808080)'
    if (i === 2) return 'linear-gradient(135deg, #CD7F32, #8B4513)'
    return 'linear-gradient(135deg, #FFE4EC, #FFB6C1)'
  }

  const top3 = data.slice(0, 3)
  const others = data.slice(3)

  const renderPodium = () => {
    if (tab === 'guild') {
      return top3.map((entry, i) => {
        const heights = ['180px', '150px', '130px']
        const order = [1, 0, 2]
        const position = order[i]
        return (
          <Col xs={8} key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 220 }}>
            {i === 0 && <div style={{ fontSize: 36, marginBottom: 8 }}>👑</div>}
            <Avatar size={72} style={{
              background: getMedalColor(i), fontSize: 32, marginBottom: 8,
              border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              {entry.avatar}
            </Avatar>
            <div style={{ fontWeight: 600, marginBottom: 4, cursor: 'pointer' }} onClick={() => navigate(`/profile/${entry.id}`)}>
              {entry.nickname}
              {entry.extra?.leader && <Tag color="gold" style={{ marginLeft: 4 }}>{entry.extra.leader}</Tag>}
            </div>
            <Tag color="magenta">{entry.score?.toLocaleString()}</Tag>
            <div
              style={{
                width: '90%', height: heights[i], marginTop: 8,
                background: getMedalColor(i), borderRadius: '12px 12px 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 28, fontWeight: 'bold',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                order: position,
              }}
            >
              #{i + 1}
            </div>
          </Col>
        )
      })
    }
    return top3.map((entry, i) => {
      const heights = ['180px', '150px', '130px']
      return (
        <Col xs={8} key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 240 }}>
          {i === 0 && <div style={{ fontSize: 36, marginBottom: 8 }}>👑</div>}
          <Avatar size={72} style={{
            background: getMedalColor(i), fontSize: 32, marginBottom: 8,
            border: '3px solid white', boxShadow: '0 4px 12px rgba(199, 21, 133, 0.3)',
          }}>
            {entry.avatar}
          </Avatar>
          <div style={{ fontWeight: 600, marginBottom: 4, cursor: 'pointer' }} onClick={() => navigate(`/profile/${entry.id}`)}>
            {entry.nickname} {entry.level && <Tag color="blue">Lv.{entry.level}</Tag>}
          </div>
          <Tag color="magenta">{entry.score?.toLocaleString()} 分</Tag>
          <div
            style={{
              width: '90%', height: heights[i], marginTop: 8,
              background: getMedalColor(i), borderRadius: '12px 12px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 28, fontWeight: 'bold',
            }}
          >
            #{i + 1}
          </div>
        </Col>
      )
    })
  }

  const tabs = [
    { key: 'collection', label: <span><StarOutlined style={{ color: '#DAA520' }} /> 收藏度榜</span>, icon: '收藏度' },
    { key: 'contest', label: <span><TrophyOutlined style={{ color: '#FF69B4' }} /> 大赛积分榜</span>, icon: '大赛积分' },
    { key: 'guildContribution', label: <span><HeartOutlined style={{ color: '#52c41a' }} /> 公会贡献榜</span>, icon: '贡献值' },
    { key: 'guild', label: <span><TeamOutlined style={{ color: '#722ed1' }} /> 公会综合榜</span>, icon: '综合实力' },
  ]

  const columns = tab === 'guild' ? [
    { title: '排名', width: 70, render: (_: any, __: any, i: number) => <b style={{ color: i < 3 ? ['#DAA520', '#C0C0C0', '#CD7F32'][i] : '#666' }}>#{i + 4}</b> },
    {
      title: '公会', key: 'guild',
      render: (_: any, e: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar style={{ background: '#FFE4EC', fontSize: 20 }}>{e.avatar}</Avatar>
          <div>
            <div style={{ fontWeight: 600, cursor: 'pointer' }}>{e.nickname}</div>
            {e.extra?.leader && <Text type="secondary" style={{ fontSize: 11 }}>会长: {e.extra.leader}</Text>}
          </div>
        </div>
      ),
    },
    { title: '等级', dataIndex: 'level', width: 80, render: (v: number) => <Tag color="magenta">Lv.{v}</Tag> },
    { title: '成员数', render: (_: any, e: any) => e.extra?.memberCount || '-' },
    { title: '胜场', render: (_: any, e: any) => e.extra?.contestsWon || 0 },
    { title: '综合分', dataIndex: 'score', align: 'right' as const, render: (v: number) => <b style={{ color: '#FF69B4', fontSize: 16 }}>{v?.toLocaleString()}</b> },
  ] : [
    { title: '排名', width: 70, render: (_: any, __: any, i: number) => <b style={{ color: i < 3 ? ['#DAA520', '#C0C0C0', '#CD7F32'][i] : '#666' }}>#{i + 4}</b> },
    {
      title: '玩家', key: 'player',
      render: (_: any, e: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate(`/profile/${e.id}`)}>
          <Avatar style={{ background: '#FFE4EC', fontSize: 18 }}>{e.avatar}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{e.nickname}</div>
            {e.level && <Text type="secondary" style={{ fontSize: 11 }}>Lv.{e.level}</Text>}
          </div>
        </div>
      ),
    },
    { title: '分数', dataIndex: 'score', align: 'right' as const, render: (v: number) => <b style={{ color: '#FF69B4', fontSize: 16 }}>{v?.toLocaleString()}</b> },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}><CrownOutlined style={{ color: '#FF69B4' }} /> 全服排行榜</Title>
          <Text type="secondary">查看全服顶尖调糖师和公会排名</Text>
        </Col>
        <Col>
          <Search placeholder="搜索玩家/公会..." prefix={<SearchOutlined />} style={{ width: 260 }} allowClear />
        </Col>
      </Row>

      <Card className="candy-card" bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={tab}
          onChange={(k) => { setTab(k); setData([]) }}
          size="large"
          centered
          items={tabs.map(t => ({ ...t, children: null }))}
        />
        <div style={{ padding: 24 }}>
          <Row justify="center" align="bottom" style={{ minHeight: 260, marginBottom: 24 }}>
            {top3.length ? renderPodium() : <Empty description="暂无排名数据" />}
          </Row>
          {others.length > 0 && (
            <Table
              dataSource={others}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              columns={columns as any}
              size="middle"
            />
          )}
        </div>
      </Card>
    </div>
  )
}

export default LeaderboardPage
