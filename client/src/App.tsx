import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import WorkshopPage from './pages/WorkshopPage'
import CandyPotPage from './pages/CandyPotPage'
import InventoryPage from './pages/InventoryPage'
import RecipePage from './pages/RecipePage'
import ContestPage from './pages/ContestPage'
import TradePage from './pages/TradePage'
import GuildPage from './pages/GuildPage'
import ReportPage from './pages/ReportPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import { useAppStore } from './store/useAppStore'
import { initSocket } from './utils/socket'

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = useAppStore((s) => s.token)
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

function App() {
  const { token, fetchUserInfo } = useAppStore()

  useEffect(() => {
    if (token) {
      fetchUserInfo()
      initSocket()
    }
  }, [token])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workshop" element={<WorkshopPage />} />
        <Route path="candy-pot" element={<CandyPotPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="recipe" element={<RecipePage />} />
        <Route path="contest" element={<ContestPage />} />
        <Route path="trade" element={<TradePage />} />
        <Route path="guild" element={<GuildPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="profile/:id" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
