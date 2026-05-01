import { useState, type FormEvent } from 'react'
import { ChefHat, ArrowRight, Eye, EyeOff, Store } from 'lucide-react'
import { signup } from '../../services/api'
import { saveAuthData } from '../../store/authStore'

type Props = {
  onSwitch: () => void
  onSignUp: () => void
}

export function SignUpForm({ onSwitch, onSignUp }: Props) {
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerEmail, setOwnerEmail]         = useState('')
  const [password, setPassword]             = useState('')
  const [showPw, setShowPw]                 = useState(false)
  const [error, setError]                   = useState('')
  const [loading, setLoading]               = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await signup({ restaurantName, ownerEmail, password })
      saveAuthData(data)
      onSignUp()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">
      {/* ── Brand panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#0f172a] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-16 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-16 -left-16 w-64 h-64 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <ChefHat size={19} className="text-white" />
          </div>
          <span className="text-white font-semibold text-[18px] tracking-tight">DineOps</span>
        </div>

        <div className="relative">
          <h2 className="text-white text-4xl font-bold leading-tight">
            Your restaurant.<br />Your dashboard.
          </h2>
          <p className="text-slate-400 text-[15px] mt-4 leading-relaxed max-w-xs">
            Set up your restaurant in under a minute. Get full access to orders, tables, staff management, and real-time insights.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { val: '< 1 min', desc: 'Setup time' },
              { val: 'Free',    desc: 'To get started' },
              { val: '100%',    desc: 'Data isolation' },
              { val: '24 / 7',  desc: 'Uptime target' },
            ].map(({ val, desc }) => (
              <div key={desc} className="bg-slate-800/60 rounded-lg p-4">
                <p className="text-white font-bold text-xl tabular-nums">{val}</p>
                <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-slate-600 text-xs">© 2026 DineOps. Secure, scalable, built for restaurants.</p>
      </div>

      {/* ── Form panel ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ChefHat size={16} className="text-white" />
            </div>
            <span className="text-slate-900 font-semibold text-lg">DineOps</span>
          </div>

          <div className="bg-white rounded-lg shadow-card p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
              <p className="text-slate-500 text-sm mt-1">Register your restaurant and get started for free</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zM8 11a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Restaurant name</label>
                <div className="relative">
                  <input
                    type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="My Pizza Place" required
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                  />
                  <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner email</label>
                <input
                  type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@restaurant.com" required
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Minimum 6 characters</p>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors mt-2 shadow-sm">
                {loading ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>Creating account…</>
                ) : (
                  <>Create Restaurant Account <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already registered?{' '}
              <button onClick={onSwitch} className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                Sign in instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
