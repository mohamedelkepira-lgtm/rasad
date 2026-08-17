import { Radar } from 'lucide-react'

export default function SplashScreen({ label = 'جارٍ التحميل...' }) {
  return (
    <div className="splash-screen">
      <div className="splash-blob splash-blob-1" />
      <div className="splash-blob splash-blob-2" />
      <div className="splash-content">
        <div className="splash-mark">
          <Radar size={40} strokeWidth={2.1} />
        </div>
        <div className="splash-name">رَصَد</div>
        <div className="splash-sub">إدارة السلوك والمخالفات</div>
        <div className="splash-loading">
          <span className="splash-dot" />
          <span className="splash-dot" />
          <span className="splash-dot" />
        </div>
        <div className="splash-label">{label}</div>
      </div>
    </div>
  )
}
