import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthData, logout, saveAuthData } from './store/authStore'
import type { AuthData } from './store/authStore'
import { getMe } from './services/api'
import { LoginForm } from './modules/auth/Login'
import { SignUpForm } from './modules/auth/SignUp'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Dashboard } from './modules/dashboard/Dashboard'

type Page = 'login' | 'signup'

function App() {
  const [auth, setAuth]               = useState<AuthData | null>(getAuthData())
  const [page, setPage]               = useState<Page>('login')
  const [activeSection, setSection]   = useState('dashboard')

  useEffect(() => {
    setAuth(getAuthData())
  }, [])

  // Re-validate JWT against the API; clear session only on 401 (e.g. revoked user, expired token).
  useEffect(() => {
    const data = getAuthData()
    if (!data?.token) return

    let cancelled = false
    getMe()
      .then((fresh) => {
        if (cancelled) return
        saveAuthData({
          token: data.token,
          tenant: fresh.tenant,
          user: fresh.user,
        })
        setAuth(getAuthData())
      })
      .catch((err) => {
        if (cancelled) return
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          logout()
          setAuth(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [auth?.token])

  // Keep the active section within what this role may access (UX mirror of RBAC).
  useEffect(() => {
    if (!auth) return
    const byRole: Record<string, string[]> = {
      admin: ['dashboard', 'orders', 'tables', 'menu', 'staff', 'reports', 'settings'],
      waiter: ['dashboard', 'orders', 'tables', 'menu'],
      kitchen: ['dashboard', 'orders'],
    }
    const allowed = new Set(byRole[auth.user.role] ?? byRole.waiter)
    if (activeSection === 'settings' && auth.user.role !== 'admin') {
      setSection('dashboard')
      return
    }
    if (!allowed.has(activeSection)) {
      setSection('dashboard')
    }
  }, [auth, activeSection])

  function handleLogout() {
    logout()
    setAuth(null)
    setPage('login')
  }

  function handleAuthSuccess() {
    setAuth(getAuthData())
  }

  // ── Authenticated: full dashboard layout ────────────────────
  if (auth) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
        <Sidebar role={auth.user.role} activeSection={activeSection} onNavigate={setSection} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header auth={auth} activeSection={activeSection} onLogout={handleLogout} />

          <main className="flex-1 overflow-y-auto">
            {activeSection === 'dashboard' && <Dashboard auth={auth} />}

            {activeSection !== 'dashboard' && (
              <div className="p-6 max-w-7xl">
                <div className="bg-white rounded-lg shadow-card p-12 text-center">
                  <p className="text-slate-400 text-sm font-medium capitalize">
                    {activeSection} — coming soon
                  </p>
                  <p className="text-slate-300 text-xs mt-1">This module is under construction.</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    )
  }

  // ── Unauthenticated: auth pages ──────────────────────────────
  if (page === 'signup') {
    return (
      <SignUpForm
        onSwitch={() => setPage('login')}
        onSignUp={handleAuthSuccess}
      />
    )
  }

  return (
    <LoginForm
      onSwitch={() => setPage('signup')}
      onLogin={handleAuthSuccess}
    />
  )
}

export default App
