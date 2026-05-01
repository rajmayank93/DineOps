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
import { Staff } from './modules/staff/Staff'
import { Tables } from './modules/tables/Tables'
import { MenuPage } from './modules/menu/MenuPage'
import { Orders } from './modules/orders/Orders'
import { Reports } from './modules/reports/Reports'
import { Settings } from './modules/settings/Settings'
import { NAV_IDS_BY_ROLE, firstSectionForRole } from './constants/navByRole'

type Page = 'login' | 'signup'

function initialActiveSection(): string {
  const a = getAuthData()
  return a ? firstSectionForRole(a.user.role) : 'dashboard'
}

function App() {
  const [auth, setAuth]               = useState<AuthData | null>(getAuthData())
  const [page, setPage]               = useState<Page>('login')
  const [activeSection, setSection]   = useState(initialActiveSection)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navigateSection = (id: string) => {
    setSection(id)
    setMobileNavOpen(false)
  }

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
    const allowedIds = NAV_IDS_BY_ROLE[auth.user.role] ?? NAV_IDS_BY_ROLE.waiter
    const allowed = new Set(allowedIds)
    const fallback = firstSectionForRole(auth.user.role)
    if (activeSection === 'settings' && auth.user.role !== 'admin') {
      setSection(fallback)
      return
    }
    if (!allowed.has(activeSection)) {
      setSection(fallback)
    }
  }, [auth, activeSection])

  useEffect(() => {
    if (!mobileNavOpen) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const close = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', close)
    close()
    return () => mq.removeEventListener('change', close)
  }, [mobileNavOpen])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNavOpen])

  function handleLogout() {
    logout()
    setAuth(null)
    setPage('login')
  }

  function handleAuthSuccess() {
    const next = getAuthData()
    setAuth(next)
    if (next) {
      setSection(firstSectionForRole(next.user.role))
    }
  }

  // ── Authenticated: full dashboard layout ────────────────────
  if (auth) {
    return (
      <div className="flex min-h-screen-dvh h-screen overflow-hidden bg-slate-50 font-sans">
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden touch-manipulation"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <Sidebar
          role={auth.user.role}
          activeSection={activeSection}
          onNavigate={navigateSection}
          mobileOpen={mobileNavOpen}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Header
            auth={auth}
            activeSection={activeSection}
            onLogout={handleLogout}
            onMenuClick={() => setMobileNavOpen(true)}
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pb-safe overscroll-y-contain">
            {activeSection === 'dashboard' && (
              <Dashboard auth={auth} onNavigate={navigateSection} />
            )}
            {activeSection === 'staff' && <Staff />}
            {activeSection === 'tables' && <Tables role={auth.user.role} />}
            {activeSection === 'menu' && <MenuPage role={auth.user.role} />}
            {activeSection === 'orders' && <Orders role={auth.user.role} />}
            {activeSection === 'reports' && <Reports />}
            {activeSection === 'settings' && <Settings />}

            {activeSection !== 'dashboard' &&
              activeSection !== 'staff' &&
              activeSection !== 'tables' &&
              activeSection !== 'menu' &&
              activeSection !== 'orders' &&
              activeSection !== 'reports' &&
              activeSection !== 'settings' && (
              <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
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
