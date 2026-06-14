import { create } from 'zustand'
import request from '../utils/request'

export interface UserInfo {
  id: string
  nickname: string
  avatar: string
  level: number
  gold: number
  points: number
  apprenticeRank: string
  isChief: boolean
  collectionScore: number
  contestScore: number
  guildContribution: number
  guildId?: string
  exp: number
  skills: { taste: number; technique: number; creativity: number }
}

export interface WorkshopInfo {
  _id: string
  name: string
  style: string
  level: number
  stations: {
    candyPot: { level: number; name: string }
    mixingBowl: { level: number; name: string }
    decorationTable: { level: number; name: string }
  }
  totalCandiesMade: number
  reputation: number
  isPublic: boolean
}

export interface FestivalInfo {
  active: boolean
  critBonus: number
  triggeredBy?: string
  endsAt?: string
}

interface AppState {
  token: string | null
  user: UserInfo | null
  workshop: WorkshopInfo | null
  festival: FestivalInfo
  onlineCount: number
  setToken: (token: string | null) => void
  setUser: (user: UserInfo | null) => void
  fetchUserInfo: () => Promise<void>
  login: (username: string, password: string) => Promise<any>
  register: (data: any) => Promise<any>
  logout: () => void
  setFestival: (f: FestivalInfo) => void
  setOnlineCount: (n: number) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  token: localStorage.getItem('candy_token'),
  user: JSON.parse(localStorage.getItem('candy_user') || 'null'),
  workshop: null,
  festival: { active: false, critBonus: 0 },
  onlineCount: 0,

  setToken: (token) => {
    if (token) localStorage.setItem('candy_token', token)
    else localStorage.removeItem('candy_token')
    set({ token })
  },

  setUser: (user) => {
    if (user) localStorage.setItem('candy_user', JSON.stringify(user))
    else localStorage.removeItem('candy_user')
    set({ user })
  },

  fetchUserInfo: async () => {
    try {
      const data = await request.get('/auth/me') as any
      set({
        user: { ...data.player, id: data.player._id },
        workshop: data.workshop,
        festival: data.festival || { active: false, critBonus: 0 },
        onlineCount: data.serverStats?.onlinePlayers || 0,
      })
    } catch (e) {}
  },

  login: async (username, password) => {
    const res = await request.post('/auth/login', { username, password }) as any
    get().setToken(res.token)
    get().setUser(res.player)
    setTimeout(() => get().fetchUserInfo(), 100)
    return res
  },

  register: async (data) => {
    const res = await request.post('/auth/register', data) as any
    get().setToken(res.token)
    get().setUser(res.player)
    return res
  },

  logout: () => {
    get().setToken(null)
    get().setUser(null)
    set({ workshop: null })
  },

  setFestival: (f) => set({ festival: f }),
  setOnlineCount: (n) => set({ onlineCount: n }),
}))
