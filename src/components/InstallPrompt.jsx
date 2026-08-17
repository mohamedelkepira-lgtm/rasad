import { useEffect, useState } from 'react'
import { Download, X, Radar } from 'lucide-react'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [showIOS, setShowIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  useEffect(() => {
    if (isIOS() && !isStandalone()) setShowIOS(true)
  }, [])

  const installed = isStandalone()
  if (installed || dismissed) return null

  const install = async () => {
    if (!deferred) {
      setShowIOS(true)
      return
    }
    deferred.prompt()
    await deferred.userChoice
    setDismissed(true)
  }

  return (
    <div className="install-banner">
      <div className="install-icon"><Radar size={20} /></div>
      <div className="install-text">
        <div className="install-title">ثبّت رَصَد على جهازك</div>
        <div className="install-sub">
          {showIOS
            ? 'من Safari: زر المشاركة ← أضِف إلى الشاشة الرئيسية'
            : 'استخدمه كتطبيق مستقل مباشرة من الشاشة الرئيسية'}
        </div>
      </div>
      <button className="install-btn" onClick={install}>
        <Download size={15} /> تثبيت
      </button>
      <button className="install-close" onClick={() => setDismissed(true)}>
        <X size={15} />
      </button>
    </div>
  )
}
