import { NavLink, useNavigate } from 'react-router-dom'
import { Radar, Home, Users, ListChecks, BarChart3, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AnimatedOutlet from './AnimatedOutlet'
import Header from './Header'

export default function Layout() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const haptic = () => {
    if (navigator.vibrate) {
      try { navigator.vibrate(8) } catch { /* noop */ }
    }
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <AnimatedOutlet />
      </main>

      <div className="nav-dock" aria-hidden="true" />
      <div className="fixed-layer">
        <button
          className="fab"
          onClick={() => { haptic(); navigate('/add') }}
          title="تسجيل مخالفة"
        >
          <Plus size={24} strokeWidth={2.6} />
        </button>
        <nav className="bottom-nav">
          <NavLink to="/" end onClick={haptic} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon"><Home size={22} strokeWidth={2.1} /></span>
            <span className="nav-label">الرئيسية</span>
          </NavLink>
          <NavLink to="/students" onClick={haptic} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon"><Users size={22} strokeWidth={2.1} /></span>
            <span className="nav-label">الطلاب</span>
          </NavLink>
          <NavLink to="/violations" onClick={haptic} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon"><ListChecks size={22} strokeWidth={2.1} /></span>
            <span className="nav-label">المخالفات</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/reports" onClick={haptic} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="nav-icon"><BarChart3 size={22} strokeWidth={2.1} /></span>
              <span className="nav-label">التقارير</span>
            </NavLink>
          )}
        </nav>
      </div>
    </div>
  )
}
