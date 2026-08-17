import { NavLink, useNavigate } from 'react-router-dom'
import { Radar, Home, Users, ListChecks, BarChart3, LogOut, Plus, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AnimatedOutlet from './AnimatedOutlet'

export default function Layout() {
  const { profile, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const initial = profile?.name?.trim()?.charAt(0) || 'م'
  const roleLabel = isAdmin ? 'مدير النظام' : 'قائد'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const haptic = () => {
    if (navigator.vibrate) {
      try { navigator.vibrate(8) } catch { /* noop */ }
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Radar size={20} strokeWidth={2.2} />
          </div>
          <div className="brand-text">
            <div className="brand-name">رَصَد</div>
            <div className="brand-sub">إدارة السلوك والمخالفات</div>
          </div>
        </div>
        <div className="spacer" />
        <div className="user-chip">
          <span className="user-info">
            <span className="user-name">{profile?.name || 'مستخدم'}</span>
            <span className={`role-badge ${isAdmin ? 'admin' : 'leader'}`}>
              {isAdmin ? <ShieldCheck size={11} /> : <UserRound size={11} />}
              {roleLabel}
            </span>
          </span>
          <span className="avatar">{initial}</span>
        </div>
        <button className="icon-btn logout-btn" onClick={handleLogout} title="تسجيل الخروج">
          <LogOut size={19} />
        </button>
      </header>

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
