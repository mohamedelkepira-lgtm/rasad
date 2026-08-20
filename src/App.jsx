import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import OfflineBanner from './components/OfflineBanner'
import InstallPrompt from './components/InstallPrompt'

// تحميل الصفحات عند الحاجة فقط (Lazy Loading) — يقلل الحزمة الأولية بشكل كبير
const Login = lazy(() => import('./pages/Login'))
const Home = lazy(() => import('./pages/Home'))
const AddViolation = lazy(() => import('./pages/AddViolation'))
const Students = lazy(() => import('./pages/Students'))
const StudentPage = lazy(() => import('./pages/StudentPage'))
const Violations = lazy(() => import('./pages/Violations'))
const ViolationDetail = lazy(() => import('./pages/ViolationDetail'))
const Reports = lazy(() => import('./pages/Reports'))
const Scan = lazy(() => import('./pages/Scan'))

function PageFallback() {
  return <div className="loading"><div className="spinner" />جارٍ فتح الصفحة...</div>
}

function Protected() {
  const { session, loading } = useAuth()
  if (loading) {
    return <SplashScreen label="جارٍ استعادة الجلسة..." />
  }
  if (!session) return <Navigate to="/login" replace />
  return <Layout />
}

function AdminOnly({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <SplashScreen label="جارٍ التحقق من الصلاحيات..." />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <OfflineBanner />
          <InstallPrompt />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Protected />}>
                <Route path="/" element={<Home />} />
                <Route path="/add" element={<AddViolation />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/:id" element={<StudentPage />} />
                <Route path="/violations" element={<Violations />} />
                <Route path="/violations/:id" element={<ViolationDetail />} />
                <Route path="/reports" element={<AdminOnly><Reports /></AdminOnly>} />
                <Route path="/scan" element={<Scan />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
