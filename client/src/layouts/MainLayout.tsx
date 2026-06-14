import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Tooltip, Statistic } from 'antd'
import {
  DashboardOutlined,
  HomeOutlined,
  FireOutlined,
  InboxOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  TeamOutlined,
  BarChartOutlined,
  CrownOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import { APPRENTICE_RANK_NAMES } from '../utils/constants'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '总览大厅' },
  { key: '/workshop', icon: <HomeOutlined />, label: '我的工坊' },
  { key: '/candy-pot', icon: <FireOutlined />, label: '熬糖台' },
  { key: '/inventory', icon: <InboxOutlined />, label: '原料背包' },
  { key: '/recipe', icon: <FileTextOutlined />, label: '配方研发' },
  { key: '/contest', icon: <TrophyOutlined />, label: '甜点大赛' },
  { key: '/trade', icon: <ShoppingOutlined />, label: '交易市场' },
  { key: '/guild', icon: <TeamOutlined />, label: '糖果公会' },
  { key: '/report', icon: <BarChartOutlined />, label: '产业报告' },
  { key: '/leaderboard', icon: <CrownOutlined />, label: '排行榜' },
]

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, workshop, festival, onlineCount, logout } = useAppStore()

  const userDropdownItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人资料', onClick: () => navigate(`/profile/${user?.id}`) },
    { key: 'settings', icon: <SettingOutlined />, label: '账号设置' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login') } },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: 'linear-gradient(180deg, #FFE4EC 0%, #FFB6C1 100%)',
          boxShadow: '2px 0 12px rgba(255, 105, 180, 0.15)',
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center', color: '#C71585', fontWeight: 'bold', fontSize: collapsed ? 20 : 18 }}>
          {collapsed ? '🍬' : '🍬 魔法糖果工坊'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderRight: 'none', color: '#8B008B' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 105, 180, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Button
              type="text"
              icon={collapsed ? <DashboardOutlined /> : <DashboardOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            {festival?.active && (
              <div className="festival-banner">
                🎉 糖果节进行中！暴击率 +{(festival.critBonus * 100).toFixed(0)}%
                {festival.triggeredBy && ` - 由 ${festival.triggeredBy} 触发`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Tooltip title={`在线玩家: ${onlineCount}`}>
              <Badge status="processing" text={<span style={{ color: '#52c41a' }}><GlobalOutlined /> {onlineCount}</span>} />
            </Tooltip>
            <Tooltip title="消息通知">
              <Badge count={3} size="small">
                <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
              </Badge>
            </Tooltip>
            {user && (
              <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Avatar size="large" style={{ background: 'linear-gradient(135deg, #FF69B4, #FF1493)', fontSize: 20 }}>
                    {user.avatar}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 600, color: '#333', lineHeight: 1.2 }}>
                      {user.nickname}
                      {user.isChief && <span style={{ color: '#DAA520', marginLeft: 4 }}>👑</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.2 }}>
                      {APPRENTICE_RANK_NAMES[user.apprenticeRank] || user.apprenticeRank} · Lv.{user.level}
                    </div>
                  </div>
                </div>
              </Dropdown>
            )}
          </div>
        </Header>
        {workshop && (
          <div style={{ padding: '8px 24px', background: 'rgba(255, 182, 193, 0.2)', borderBottom: '1px solid rgba(255, 105, 180, 0.1)', display: 'flex', gap: 24, fontSize: 13 }}>
            <Statistic title="工坊" value={workshop.name} valueStyle={{ fontSize: 14, color: '#C71585' }} />
            <Statistic title="工坊等级" value={`Lv.${workshop.level}`} valueStyle={{ fontSize: 14, color: '#722ed1' }} />
            <Statistic title="已制作糖果" value={workshop.totalCandiesMade} valueStyle={{ fontSize: 14, color: '#52c41a' }} suffix="个" />
            <Statistic title="金币" value={user?.gold?.toLocaleString()} valueStyle={{ fontSize: 14, color: '#DAA520' }} suffix="💰" />
          </div>
        )}
        <Content className="page-container">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
