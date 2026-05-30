import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/app/store/useAppStore'
import { useAppSelector } from '@/app/store/useAppSelector'
import { getCurrentUser } from '@/app/store/selectors'
import { getAdminDashboard, getAdminRoles, type AdminActionLog, type AdminSuspiciousUser, type AdminRole } from '@/features/sync/serverClient'
import { Button } from '@/shared/components/ui/Button'

type Tab = 'logs' | 'suspicious' | 'roles'

const POLL_INTERVAL_MS = 10_000 // refresh logs every 10 seconds

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString()
}

const ScoreBadge = ({ score }: { score: number }) => {
  const color = score >= 10 ? '#ef4444' : score >= 5 ? '#f97316' : '#eab308'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '9999px',
      background: color,
      color: '#fff',
      fontWeight: 700,
      fontSize: '0.8rem',
    }}>
      {score}
    </span>
  )
}

const RoleBadge = ({ role }: { role: string }) => {
  const isAdmin = role === 'admin'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '9999px',
      background: isAdmin ? '#7c3aed' : '#374151',
      color: '#fff',
      fontWeight: 600,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {role}
    </span>
  )
}

export const AdminPage = () => {
  const navigate = useNavigate()
  const { state } = useAppStore()
  const currentUser = getCurrentUser(state)
  const [tab, setTab] = useState<Tab>('logs')
  const [logs, setLogs] = useState<AdminActionLog[]>([])
  const [suspiciousUsers, setSuspiciousUsers] = useState<AdminSuspiciousUser[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const lastSyncedAt = useAppSelector((state) => state.sync.lastSyncedAt)

  // Stable ref so the interval always calls the latest fetchData
  // without needing fetchData in the interval's dependency array
  const fetchDataRef = useRef<((silent: boolean) => Promise<void>) | null>(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [dashboard, rolesData] = await Promise.all([
        getAdminDashboard(50),
        getAdminRoles(),
      ])
      setLogs(dashboard.logs)
      setSuspiciousUsers(dashboard.suspiciousUsers)
      setRoles(rolesData)
      setLastUpdated(new Date())
    } catch {
      setError('Failed to load admin data.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Keep ref in sync with latest fetchData
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  // Initial load + access guard
  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    if (currentUser.role !== 'admin') {
      navigate('/listings')
      return
    }
    void fetchData(false)
  }, [currentUser, navigate, fetchData])

  // Auto-poll — uses ref so interval is created once and never reset
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return

    const interval = setInterval(() => {
      void fetchDataRef.current?.(true)
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [currentUser]) // intentionally no fetchData dep — ref handles it

  // Refresh immediately whenever the WebSocket pushes new data to the store
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || !lastSyncedAt) return
    void fetchDataRef.current?.(true)
  }, [lastSyncedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUser || currentUser.role !== 'admin') {
    return null
  }

  return (
    <section className="mc-page">
      <header className="mc-page__header">
        <div>
          <h1 className="mc-page__title">Admin Dashboard</h1>
          <p className="mc-page__subtitle">
            Monitor user actions, suspicious behaviour, and role definitions.
          </p>
          {lastUpdated && (
            <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '4px' }}>
              Last updated: {lastUpdated.toLocaleTimeString()} · auto-refreshes every {POLL_INTERVAL_MS / 1000}s
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => void fetchData(false)}>
            Refresh
          </Button>
          <Button variant="ghost" onClick={() => navigate('/listings')}>
            Back to Listings
          </Button>
        </div>
      </header>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Logs', value: logs.length },
          { label: 'Suspicious Users', value: suspiciousUsers.length },
          { label: 'Roles Defined', value: roles.length },
          { label: 'High Risk (score ≥10)', value: suspiciousUsers.filter(u => u.score >= 10).length },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: '1 1 140px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'var(--mc-surface, #1a1a2e)',
            border: '1px solid var(--mc-border, #2a2a3e)',
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--mc-border, #2a2a3e)' }}>
        {(['logs', 'suspicious', 'roles'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 400,
              borderBottom: tab === t ? '2px solid var(--mc-accent, #7c3aed)' : '2px solid transparent',
              color: tab === t ? 'var(--mc-accent, #7c3aed)' : 'inherit',
              fontSize: '0.9rem',
              textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}
          >
            {t === 'logs' ? `Action Logs (${logs.length})` : t === 'suspicious' ? `Suspicious Users (${suspiciousUsers.length})` : `Roles (${roles.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mc-empty">Loading...</div>
      ) : error ? (
        <div className="mc-empty" style={{ color: '#ef4444' }}>{error}</div>
      ) : (
        <>
          {/* Action Logs */}
          {tab === 'logs' && (
            <div style={{ overflowX: 'auto' }}>
              {logs.length === 0 ? (
                <div className="mc-empty">No action logs yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--mc-border, #2a2a3e)', textAlign: 'left' }}>
                      {['Timestamp', 'User', 'Role', 'Action', 'Details'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', fontWeight: 600, opacity: 0.7, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--mc-border, #2a2a3e)' }}>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', opacity: 0.6, fontSize: '0.8rem' }}>{formatDate(log.createdAt)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{log.username}</td>
                        <td style={{ padding: '10px 12px' }}><RoleBadge role={log.role} /></td>
                        <td style={{ padding: '10px 12px' }}>
                          <code style={{ fontSize: '0.8rem', background: 'var(--mc-surface, #1a1a2e)', padding: '2px 6px', borderRadius: '4px' }}>
                            {log.action}
                          </code>
                        </td>
                        <td style={{ padding: '10px 12px', opacity: 0.8 }}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Suspicious Users */}
          {tab === 'suspicious' && (
            <div>
              {suspiciousUsers.length === 0 ? (
                <div className="mc-empty">No suspicious users detected.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {suspiciousUsers.map(user => (
                    <div key={user.id} style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'var(--mc-surface, #1a1a2e)',
                      border: `1px solid ${user.score >= 10 ? '#ef4444' : user.score >= 5 ? '#f97316' : '#eab308'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700 }}>{user.username}</span>
                          <RoleBadge role={user.role} />
                          <ScoreBadge score={user.score} />
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{user.reason}</div>
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.5, whiteSpace: 'nowrap' }}>
                        <div>First seen: {formatDate(user.createdAt)}</div>
                        <div>Last updated: {formatDate(user.updatedAt)}</div>
                        {user.resolvedAt && <div style={{ color: '#22c55e' }}>Resolved: {formatDate(user.resolvedAt)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roles */}
          {tab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roles.length === 0 ? (
                <div className="mc-empty">No roles defined.</div>
              ) : (
                roles.map(role => (
                  <div key={role.id} style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'var(--mc-surface, #1a1a2e)',
                    border: '1px solid var(--mc-border, #2a2a3e)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{role.name}</span>
                      <RoleBadge role={role.name} />
                    </div>
                    {role.description && (
                      <div style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '10px' }}>{role.description}</div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {role.permissions.map(p => (
                        <span key={p} style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--mc-border, #2a2a3e)',
                          fontFamily: 'monospace',
                        }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}