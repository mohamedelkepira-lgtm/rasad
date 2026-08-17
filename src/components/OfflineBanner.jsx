import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="offline-banner">
      <WifiOff size={16} />
      <span>لا يوجد اتصال بالإنترنت، بعض وظائف التطبيق غير متاحة حاليًا.</span>
      <Wifi size={14} style={{ opacity: 0.6 }} />
    </div>
  )
}
