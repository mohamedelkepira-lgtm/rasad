import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radar, UserRound, LockKeyhole, LogIn, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, loading, isSupabaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isSupabaseConfigured) {
      setError('تعذر الاتصال بالنظام، حاول لاحقًا.')
      return
    }
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg login-blob-1" />
      <div className="login-bg login-blob-2" />

      <div className="login-brand">
        <div className="login-mark">
          <Radar size={30} strokeWidth={2.2} />
        </div>
        <h1 className="login-title">رَصَد</h1>
        <p className="login-sub">إدارة السلوك والمخالفات المدرسية</p>
      </div>

      <div className="login-card">
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-user">اسم المستخدم</label>
            <div className="input-wrap">
              <UserRound size={17} className="input-icon" />
              <input
                id="login-user"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-pass">كلمة المرور</label>
            <div className="input-wrap">
              <LockKeyhole size={17} className="input-icon" />
              <input
                id="login-pass"
                dir="ltr"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass((v) => !v)} tabIndex="-1">
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button className="btn-login" disabled={submitting || loading}>
            <LogIn size={18} />
            {submitting ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>

      <p className="login-foot">رَصَد © {new Date().getFullYear()} — منصة إدارة السلوك المدرسية</p>
    </div>
  )
}
