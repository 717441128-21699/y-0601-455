import { useState } from 'react'
import { Form, Input, Button, Card, Tabs, message, Typography } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, SmileOutlined, CandyOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

const { Title, Paragraph } = Typography

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const handleLogin = async (values: any) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      message.success('登录成功！欢迎来到魔法糖果世界 🍬')
      navigate(from)
    } catch (e) { /* handled by interceptor */ }
    finally { setLoading(false) }
  }

  const handleRegister = async (values: any) => {
    setLoading(true)
    try {
      await register(values)
      message.success('注册成功！您已获得初始原料和试糖纸')
      navigate('/dashboard')
    } catch (e) { /* handled by interceptor */ }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FFE4EC 0%, #FFB6C1 30%, #FF69B4 70%, #C71585 100%)',
      padding: 24,
    }}>
      <div style={{
        display: 'flex',
        maxWidth: 1000,
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(199, 21, 133, 0.35)',
      }}>
        <div style={{
          flex: 1,
          padding: 48,
          background: 'linear-gradient(135deg, #fff 0%, #fff5fb 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍬🍭🍫</div>
          <Title level={1} className="candy-gradient-text" style={{ marginBottom: 8 }}>魔法糖果工坊</Title>
          <Paragraph type="secondary" style={{ fontSize: 15, marginBottom: 32 }}>
            踏入梦幻糖果世界，开启你的调糖师人生！<br />
            采集魔法花果、熬制独特糖果、参加甜点大赛、共建甜蜜公会~
          </Paragraph>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🌺</span>
              <span>收集 <b>90+ 种魔法原料</b>，搭配无限可能</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <span>每日 <b>甜点大赛</b>，赢限定图纸和积分</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🤝</span>
              <span>建立公会 <b>联合工坊</b>，全员加成共享</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>📊</span>
              <span>每周产业报告，导出 <b>PDF 数据图表</b></span>
            </div>
          </div>
        </div>
        <Card style={{ flex: 1, borderRadius: 0, padding: 24 }} bordered={false}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            size="large"
            items={[
              { key: 'login', label: '🎀 登录' },
              { key: 'register', label: '🌟 注册' },
            ]}
          />
          {activeTab === 'login' ? (
            <Form layout="vertical" onFinish={handleLogin} style={{ marginTop: 24 }}>
              <Form.Item name="username" rules={[{ required: true, message: '请输入用户名或邮箱' }]} label="账号">
                <Input prefix={<UserOutlined />} size="large" placeholder="用户名 / 邮箱" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]} label="密码">
                <Input.Password prefix={<LockOutlined />} size="large" placeholder="密码" />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ height: 48, fontSize: 16, fontWeight: 600 }}>
                🍬 进入糖果世界
              </Button>
              <div style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
                测试账号：chief/chief123（首席）、player1~player5 / 123456
              </div>
            </Form>
          ) : (
            <Form layout="vertical" onFinish={handleRegister} style={{ marginTop: 24 }}>
              <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]} label="用户名">
                <Input prefix={<UserOutlined />} size="large" placeholder="设置登录用户名" />
              </Form.Item>
              <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]} label="邮箱">
                <Input prefix={<MailOutlined />} size="large" placeholder="邮箱地址" />
              </Form.Item>
              <Form.Item name="nickname" rules={[{ required: true, message: '请输入昵称' }]} label="游戏昵称">
                <Input prefix={<SmileOutlined />} size="large" placeholder="您的调糖师名称" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, min: 6, message: '密码至少6位' }]} label="密码">
                <Input.Password prefix={<LockOutlined />} size="large" placeholder="设置登录密码" />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ height: 48, fontSize: 16, fontWeight: 600 }}>
                ✨ 开始甜蜜冒险
              </Button>
            </Form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
