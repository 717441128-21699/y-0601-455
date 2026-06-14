import { useState, useEffect, useRef } from 'react'
import {
  Row, Col, Card, Tabs, Button, Empty, Typography, Statistic, Space, Tag, Table, message, Spin
} from 'antd'
import {
  BarChartOutlined, DownloadOutlined, LineChartOutlined, HeatMapOutlined,
  RiseOutlined, FilePdfOutlined, ReloadOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import request from '../utils/request'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const ReportPage = () => {
  const [tab, setTab] = useState('latest')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { loadLatest() }, [])

  const loadLatest = async () => {
    setLoading(true)
    try {
      const res: any = await request.get('/report/latest')
      setReport(res)
    } finally { setLoading(false) }
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const res: any = await request.post('/report/generate')
      if (res.success) {
        message.success('报告生成成功！')
        setReport(res.report)
      }
    } finally { setGenerating(false) }
  }

  const downloadPDF = async () => {
    if (!report) return
    setDownloading(true)
    try {
      const blob: any = await request.get(`/report/pdf/${report._id}`, {
        responseType: 'blob',
      } as any)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `candy-report-${dayjs(report.weekStart).format('YYYYMMDD')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      message.success('PDF 下载成功')
    } finally { setDownloading(false) }
  }

  const heatmapOption = (() => {
    if (!report?.materialUsageHeatmap?.length) return null
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const topMats = report.topMaterials?.slice(0, 5).map((m: any) => m.name) || []
    const data: number[][] = []
    let maxVal = 0
    for (let h = 0; h < 24; h++) {
      for (let d = 0; d < 7; d++) {
        const cell = report.materialUsageHeatmap.find((x: any) => x.hour === h && x.weekday === d)
        let val = 0
        if (cell?.counts) {
          val = Object.values(cell.counts).reduce((s: number, v: any) => s + (v || 0), 0)
        }
        if (val > maxVal) maxVal = val
        data.push([d, h, val])
      }
    }
    return {
      tooltip: { position: 'top' },
      grid: { height: '60%', top: '10%' },
      xAxis: { type: 'category', data: weekdays, splitArea: { show: true } },
      yAxis: { type: 'category', data: hours, splitArea: { show: true } },
      visualMap: {
        min: 0, max: maxVal || 100, calculable: true, orient: 'horizontal', left: 'center', bottom: '2%',
        inRange: { color: ['#FFF5FB', '#FFB6C1', '#FF69B4', '#C71585'] },
      },
      series: [{
        name: '原料使用量',
        type: 'heatmap',
        data,
        label: { show: maxVal < 200, fontSize: 10 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      }],
    }
  })()

  const priceTrendOption = (() => {
    if (!report?.tradePriceTrends?.length) return null
    const grouped = new Map<string, any[]>()
    for (const t of report.tradePriceTrends) {
      if (!grouped.has(t.itemKey)) grouped.set(t.itemKey, [])
      grouped.get(t.itemKey)!.push(t)
    }
    const topKeys = Array.from(grouped.entries())
      .sort((a, b) => b[1].reduce((s: number, x: any) => s + x.volume, 0) - a[1].reduce((s: number, x: any) => s + x.volume, 0))
      .slice(0, 5)

    const legend = topKeys.map(([k]) => k.slice(0, 12))
    const allDates = Array.from(new Set(report.tradePriceTrends.map((t: any) => t.date))).sort()

    const series = topKeys.map(([key, items], i) => {
      const byDate = new Map(items.map(x => [x.date, x.avgPrice]))
      return {
        name: legend[i],
        type: 'line',
        smooth: true,
        data: allDates.map(d => byDate.get(d) || null),
        emphasis: { focus: 'series' },
      }
    })

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: legend, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: allDates.map(d => d.slice(5)) },
      yAxis: { type: 'value', name: '金币' },
      series,
      color: ['#FF69B4', '#722ed1', '#1890ff', '#52c41a', '#FA8C16'],
    }
  })()

  const scoreCurveOption = (() => {
    if (!report?.contestScoreCurves?.length) return null
    const contestGroups = new Map<string, any[]>()
    for (const s of report.contestScoreCurves) {
      if (!contestGroups.has(s.contestId)) contestGroups.set(s.contestId, [])
      contestGroups.get(s.contestId)!.push(s)
    }
    const firstContest = contestGroups.values().next().value
    if (!firstContest) return null

    const playerGroups = new Map<string, any[]>()
    for (const s of firstContest) {
      if (!playerGroups.has(s.participantId)) playerGroups.set(s.participantId, [])
      playerGroups.get(s.participantId)!.push(s)
    }
    const topPlayers = Array.from(playerGroups.entries())
      .sort((a, b) => b[1][b[1].length - 1]?.score - a[1][a[1].length - 1]?.score)
      .slice(0, 6)

    const times = Array.from(new Set(firstContest.map(s => s.timestamp))).sort()
    const series = topPlayers.map(([pid, pts], i) => {
      const byTime = new Map(pts.map(p => [p.timestamp, p.score]))
      return {
        name: `选手${i + 1}`,
        type: 'line',
        smooth: true,
        areaStyle: i === 0 ? { opacity: 0.15 } : undefined,
        data: times.map(t => byTime.get(t) || null),
      }
    })

    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: times.map(t => dayjs(t).format('HH:mm:ss')),
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: 'value', name: '分数' },
      series,
    }
  })()

  const materialBarOption = (() => {
    if (!report?.topMaterials?.length) return null
    const top = report.topMaterials.slice(0, 10)
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '使用量' },
      yAxis: { type: 'category', data: top.map((m: any) => m.name).reverse() },
      series: [{
        type: 'bar',
        data: top.map((m: any) => m.usage).reverse(),
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#FFB6C1' },
              { offset: 1, color: '#FF1493' },
            ],
          },
        },
      }],
    }
  })()

  const radarOption = (() => {
    if (!report?.topCandies?.length) return null
    const top = report.topCandies.slice(0, 1)
    const sample = top[0]
    if (!sample) return null
    const score = sample.score || 100
    const indicators = [
      { name: '甜度', max: 200 },
      { name: '魔力', max: 200 },
      { name: '稀有度', max: Math.max(score, 200) },
      { name: '词缀', max: 6 },
      { name: '特效', max: 4 },
      { name: '竞争力', max: Math.max(score * 1.2, 300) },
    ]
    return {
      tooltip: {},
      legend: { data: [sample.candyName] },
      radar: { indicator: indicators, splitArea: { areaStyle: { color: ['rgba(255,105,180,0.02)', 'rgba(255,105,180,0.06)'] } } },
      series: [{
        type: 'radar',
        data: [{
          name: sample.candyName,
          value: [Math.min(150, score * 0.6), Math.min(140, score * 0.5), score, 3, 2, score * 0.9],
          areaStyle: { color: 'rgba(255, 105, 180, 0.3)' },
          lineStyle: { color: '#FF69B4' },
          itemStyle: { color: '#C71585' },
        }],
      }],
    }
  })()

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}><BarChartOutlined style={{ color: '#FF69B4' }} /> 糖果产业报告</Title>
          <Text type="secondary">每周一更新，可导出 PDF 报告</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadLatest} loading={loading}>刷新</Button>
            <Button icon={<RiseOutlined />} onClick={generate} loading={generating}>
              立即生成
            </Button>
            {report && (
              <Button type="primary" icon={<FilePdfOutlined />} onClick={downloadPDF} loading={downloading}>
                下载 PDF
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {report ? (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} md={6}>
                <Card className="candy-card">
                  <Statistic title="报告周期" value={`${dayjs(report.weekStart).format('MM-DD')} 至 ${dayjs(report.weekEnd).format('MM-DD')}`} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="candy-card">
                  <Statistic title="总制作糖果" value={report.totalCandiesMade} suffix="件" valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="candy-card">
                  <Statistic title="举办大赛" value={report.totalContests} suffix="场" valueStyle={{ color: '#722ed1' }} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="candy-card">
                  <Statistic title="交易总金额" value={report.totalTradeVolume} suffix="💰" valueStyle={{ color: '#DAA520' }} />
                </Card>
              </Col>
            </Row>

            <Tabs
              activeKey={tab}
              onChange={setTab}
              size="large"
              items={[
                {
                  key: 'latest',
                  label: <span><HeatMapOutlined /> 综合分析</span>,
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} xl={14}>
                        <Card title={<span><HeatMapOutlined style={{ color: '#FF69B4' }} /> 原料使用热力图（按小时/星期）</span>} className="candy-card">
                          {heatmapOption ? (
                            <ReactECharts option={heatmapOption} style={{ height: 420 }} />
                          ) : <Empty description="暂无热力图数据" />}
                        </Card>
                      </Col>
                      <Col xs={24} xl={10}>
                        <Card title={<span><BarChartOutlined style={{ color: '#722ed1' }} /> TOP10 原料使用量</span>} className="candy-card">
                          {materialBarOption ? (
                            <ReactECharts option={materialBarOption} style={{ height: 420 }} />
                          ) : <Empty description="暂无数据" />}
                        </Card>
                      </Col>
                      <Col xs={24} xl={12}>
                        <Card title={<span><LineChartOutlined style={{ color: '#1890ff' }} /> 交易价格走势（TOP 品类）</span>} className="candy-card">
                          {priceTrendOption ? (
                            <ReactECharts option={priceTrendOption} style={{ height: 360 }} />
                          ) : <Empty description="暂无交易数据" />}
                        </Card>
                      </Col>
                      <Col xs={24} xl={12}>
                        <Card title={<span><RiseOutlined style={{ color: '#52c41a' }} /> 大赛评分曲线</span>} className="candy-card">
                          {scoreCurveOption ? (
                            <ReactECharts option={scoreCurveOption} style={{ height: 360 }} />
                          ) : <Empty description="暂无大赛数据" />}
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: 'top',
                  label: <span><RiseOutlined /> 本周TOP榜</span>,
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Card title="🏆 TOP10 原料" className="candy-card">
                          <Table
                            size="small"
                            dataSource={report.topMaterials || []}
                            rowKey="materialId"
                            pagination={false}
                            columns={[
                              { title: '排名', width: 60, render: (_: any, __: any, i: number) => <b>#{i + 1}</b> },
                              { title: '原料名称', dataIndex: 'name' },
                              { title: '使用量', dataIndex: 'usage', render: (v: number) => <b style={{ color: '#FF69B4' }}>{v?.toLocaleString()}</b>, align: 'right' as const },
                            ]}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card title="⭐ TOP10 糖果" className="candy-card">
                          <Table
                            size="small"
                            dataSource={report.topCandies || []}
                            rowKey={(r, i) => i?.toString()}
                            pagination={false}
                            columns={[
                              { title: '排名', width: 60, render: (_: any, __: any, i: number) => <b>#{i + 1}</b> },
                              { title: '糖果名称', dataIndex: 'candyName' },
                              { title: '作者', dataIndex: 'creator' },
                              { title: '稀有度', dataIndex: 'score', render: (v: number) => <b style={{ color: '#722ed1' }}>{v?.toLocaleString()}</b>, align: 'right' as const },
                            ]}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card title="🎯 TOP 玩家榜" className="candy-card">
                          <Table
                            size="small"
                            dataSource={report.topPlayers || []}
                            rowKey={(r: any, i) => `${r.playerId}-${i}`}
                            pagination={false}
                            columns={[
                              { title: '排名', width: 60, render: (_: any, __: any, i: number) => <b>#{i + 1}</b> },
                              { title: '玩家', dataIndex: 'nickname' },
                              { title: '类目', dataIndex: 'category', render: (v: string) => <Tag color="blue">{v}</Tag> },
                              { title: '分数', dataIndex: 'score', render: (v: number) => <b style={{ color: '#DAA520' }}>{v?.toLocaleString()}</b>, align: 'right' as const },
                            ]}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card title="📊 冠军糖果属性雷达图" className="candy-card">
                          {radarOption ? (
                            <ReactECharts option={radarOption} style={{ height: 360 }} />
                          ) : <Empty description="暂无数据" />}
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
              ]}
            />
          </div>
        ) : (
          <Card className="candy-card">
            <Empty
              description={generating ? '报告生成中...' : '暂无报告，点击右上角生成第一份报告'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<RiseOutlined />} onClick={generate} loading={generating}>
                立即生成产业报告
              </Button>
            </Empty>
          </Card>
        )}
      </Spin>
    </div>
  )
}

export default ReportPage
