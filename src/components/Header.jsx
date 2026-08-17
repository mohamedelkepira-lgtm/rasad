import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Radar, Home, Users, AlertTriangle, BarChart3, Search, Bell,
  ChevronDown, LogOut, Plus, Menu, X, Sun, UserRound, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getDashboardStats, searchStudents } from '../lib/api'
import { isSupabaseConfigured } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

const NAV_ITEMS = [
  { to: '/', label: 'الرئيسية', icon: <Home size={16} strokeWidth={2.2} />, end: true },
  { to: '/students', label: 'الطلاب', icon: <Users size={16} strokeWidth={2.2} /> },
  { to: '/violations', label: 'المخالفات', icon: <AlertTriangle size={16} strokeWidth={2.2} /> },
  { to: '/reports', label: 'التقارير', icon: <BarChart3 size={16} strokeWidth={2.2} /> }
]

export default function Header() {
  const { profile, isAdmin, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const debounce = useRef(null)
  const searchRef = useRef(null)

  const initial = profile?.name?.trim()?.charAt(0) || 'م'
  const roleLabel = isAdmin ? 'مدير النظام' : 'Leader'
  const firstName = profile?.name?.split(' ')[0] || 'مستخدم'

  const navItems = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter((i) => i.to !== '/reports')

  // إشعارات: مخالفات اليوم (عدد حقيقي من النظام)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        const stats = await getDashboardStats()
        if (!cancelled) setNotifCount(stats?.todayCount ?? 0)
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [])

  // بحث فوري
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!q.trim()) {
      setResults([])
      return
    }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchStudents(q.trim()))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [q])

  const closeMenu = () => setMenuOpen(false)
  const toggleSearch = () => {
    const next = !searchOpen
    setSearchOpen(next)
    if (next) requestAnimationFrame(() => searchRef.current?.focus())
  }

  const goStudent = (id) => {
    setQ('')
    setResults([])
    setSearchOpen(false)
    navigate(`/students/${id}`)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      toast('تعذر تسجيل الخروج', 'error')
    }
  }

  const haptic = () => {
    if (navigator.vibrate) {
      try { navigator.vibrate(8) } catch { /* noop */ }
    }
  }

  // إغلاق الـ menu عند تغيير المسار
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const roleIcon = isAdmin ? <ShieldCheck size={12} /> : <UserRound size={12} />

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير'
  const todayLabel = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })

  const isHome = location.pathname === '/'

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="header-identity">
            <button
              className="header-icon-btn header-menu-btn"
              onClick={() => { haptic(); setMenuOpen(true) }}
              title="القائمة"
              aria-label="القائمة"
            >
              <Menu size={20} strokeWidth={2.2} />
            </button>

            <div className="header-brand">
              <div className="brand-mark"><Radar size={19} strokeWidth={2.2} /></div>
              <div className="header-brand-text">
                <div className="header-brand-name">رَصَد</div>
                <div className="header-brand-sub">نظام إدارة المخالفات الطلابية</div>
              </div>
            </div>
          </div>

          <nav className="header-nav" aria-label="التنقل الرئيسي">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 'header-nav-item' + (isActive ? ' active' : '')}
                onClick={haptic}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="header-tools">
            <button
              className="header-icon-btn header-search-btn"
              onClick={toggleSearch}
              title="بحث"
              aria-label="بحث"
            >
              <Search size={18} strokeWidth={2.1} />
            </button>

            <div className={'header-search' + (searchOpen ? ' header-search-open' : '')}>
              <Search size={17} className="header-search-icon" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="ابحث عن طالب..."
                className="header-search-input"
                aria-label="ابحث عن طالب"
              />
              {(searchOpen || q) && results.length > 0 && (
                <div className="header-search-results">
                  {results.map((s) => (
                    <div className="header-search-result" key={s.id} onMouseDown={() => goStudent(s.id)}>
                      <span className="search-result-avatar">{s.name.charAt(0)}</span>
                      <div className="search-result-body">
                        <div className="search-result-name">{s.name}</div>
                        <div className="search-result-sub">{s.class_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(searchOpen || q) && searching && (
                <div className="header-search-results">
                  <div className="header-search-loading"><div className="spinner" />بحث...</div>
                </div>
              )}
            </div>

            <span className="header-divider" aria-hidden="true" />

            <button className="header-icon-btn header-notif" title="إشعارات" aria-label="إشعارات">
              <Bell size={19} strokeWidth={2.1} />
              {notifCount > 0 && <span className="header-badge">{notifCount > 99 ? '99+' : notifCount}</span>}
            </button>

            <div className="header-user">
              <span className="header-avatar">{initial}</span>
              <span className="header-user-info">
                <span className="header-user-name">{profile?.name || 'مستخدم'}</span>
                <span className="header-user-role">
                  {roleIcon}
                  {roleLabel}
                </span>
              </span>
              <ChevronDown size={16} className="header-chevron" />
            </div>
          </div>
        </div>
      </header>

      {/* Quick greeting / action bar (mobile, on Home) */}
      {isHome && (
        <div className="header-greeting">
          <div className="header-greeting-main">
            <div className="header-greeting-text">
              <div className="header-greeting-hello">{greeting}، {firstName}</div>
              <div className="header-greeting-date">{todayLabel}</div>
            </div>
            <Sun size={26} strokeWidth={2} className="header-greeting-sun" />
          </div>
          <div className="header-greeting-row">
            <span className="header-greeting-status">
              <span className="header-greeting-dot" />
              {notifCount > 0 ? `${notifCount} مخالفة اليوم` : 'لا مخالفات اليوم'}
            </span>
            <button
              className="header-greeting-action"
              onClick={() => { haptic(); navigate('/add') }}
            >
              <Plus size={16} strokeWidth={2.6} />
              سجل مخالفة
            </button>
          </div>
        </div>
      )}

      {/* Mobile menu (hamburger drawer) */}
      {menuOpen && (
        <div className="header-menu-overlay" onClick={closeMenu}>
          <div className="header-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="header-menu-head">
              <div className="header-menu-brand">
                <div className="brand-mark"><Radar size={18} strokeWidth={2.2} /></div>
                <span className="header-menu-brand-name">رَصَد</span>
              </div>
              <button className="header-icon-btn header-menu-close" onClick={closeMenu} title="إغلاق" aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>

            <nav className="header-menu-nav" aria-label="قائمة التنقل">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => 'header-menu-item' + (isActive ? ' active' : '')}
                  onClick={closeMenu}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="header-menu-footer">
              <div className="header-menu-user">
                <span className="header-avatar">{initial}</span>
                <div className="header-menu-user-info">
                  <div className="header-menu-user-name">{profile?.name || 'مستخدم'}</div>
                  <div className="header-menu-user-role">
                    {roleIcon}
                    {roleLabel}
                  </div>
                </div>
              </div>
              <button className="header-menu-logout" onClick={handleLogout} title="تسجيل الخروج" aria-label="تسجيل الخروج">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}