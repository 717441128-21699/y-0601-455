import { io, Socket } from 'socket.io-client'
import { useAppStore } from '../store/useAppStore'
import { message, notification } from 'antd'

let socketInstance: Socket | null = null

export const initSocket = (): Socket => {
  if (socketInstance && socketInstance.connected) return socketInstance

  const token = localStorage.getItem('candy_token') || ''
  socketInstance = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  })

  socketInstance.on('connect', () => {
    console.log('🍬 Socket connected')
  })

  socketInstance.on('disconnect', () => {
    console.log('Socket disconnected')
  })

  socketInstance.on('online_count', (data: { count: number }) => {
    useAppStore.getState().setOnlineCount(data.count)
  })

  socketInstance.on('candy_festival_started', (data: any) => {
    useAppStore.getState().setFestival({
      active: true,
      critBonus: data.critBonus,
      triggeredBy: data.triggeredBy,
      endsAt: data.endsAt,
    })
    notification.success({
      message: '🎉 糖果节开幕！',
      description: `由玩家【${data.triggeredBy}】触发！今日全服熬糖暴击率 +${(data.critBonus * 100).toFixed(0)}%`,
      duration: 10,
      placement: 'topRight',
    })
  })

  socketInstance.on('festival_ended', () => {
    useAppStore.getState().setFestival({ active: false, critBonus: 0 })
    message.info('糖果节已结束')
  })

  socketInstance.on('trade_completed', (data: any) => {
    message.info(
      `【全服公告】玩家 ${data.buyer} 购买了 ${data.seller} 的${data.itemType === 'candy' ? '糖果' : '配方'}，价值 ${data.price.toLocaleString()} 金币！`
    )
  })

  socketInstance.on('contest_started', (data: any) => {
    notification.info({
      message: '🎯 甜点大赛开始！',
      description: data.title,
      duration: 5,
    })
  })

  socketInstance.on('contest_ended', (data: any) => {
    notification.success({
      message: '🏆 甜点大赛结束',
      description: data.results?.length ? `共${data.results.length}位选手参赛` : '比赛已完成',
      duration: 8,
    })
  })

  return socketInstance
}

export const getSocket = (): Socket | null => socketInstance

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
