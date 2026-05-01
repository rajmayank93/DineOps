import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Settings as SettingsIcon, Building2 } from 'lucide-react'
import { getAdminTenant, type AdminTenant } from '../../services/api'

export function Settings() {
  const [tenant, setTenant] = useState<AdminTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const t = await getAdminTenant()
      setTenant(t)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { message?: string })?.message ?? 'Could not load settings.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="p-4 sm:p-6 max-w-xl space-y-6 mx-auto w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SettingsIcon size={24} className="text-indigo-600 shrink-0" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Restaurant profile and plan (read-only for now).</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : tenant ? (
        <div className="bg-white rounded-lg shadow-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Building2 size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Restaurant</p>
              <p className="text-lg font-bold text-slate-900">{tenant.name}</p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm border-t border-slate-100 pt-4">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Owner email</dt>
              <dd className="font-medium text-slate-800 text-right break-all">{tenant.ownerEmail}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Tier</dt>
              <dd className="font-medium text-slate-800 capitalize">{tenant.tier}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-800">{tenant.isActive ? 'Active' : 'Inactive'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="font-medium text-slate-800 tabular-nums">
                {new Date(tenant.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Tenant ID</dt>
              <dd className="font-mono text-xs text-slate-600 text-right break-all">{tenant.id}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  )
}
