import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/app/store/useAppStore'
import { useAppSelector } from '@/app/store/useAppSelector'
import { getCurrentUser } from '@/app/store/selectors'
import {
  getAdminDashboard,
  getAdminRoles,
  getAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  banUser,
  unbanUser,
  type AdminActionLog,
  type AdminSuspiciousUser,
  type AdminRole,
  type AdminAccessRequest,
} from '@/features/sync/serverClient'
import { Button } from '@/shared/components/ui/Button'

type Tab = 'logs' | 'suspicious' | 'requests' | 'roles'

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
  const [requests, setRequests] = useState<AdminAccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadWarning, setLoadWarning] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [banEmail, setBanEmail] = useState('')
  const [banReason, setBanReason] = useState('')

  const lastSyncedAt = useAppSelector((state) => state.sync.lastSyncedAt)

  // Stable ref so the interval always calls the latest fetchData
  // without needing fetchData in the interval's dependency array
  const fetchDataRef = useRef<((silent: boolean) => Promise<void>) | null>(null)
  // Guards against overlapping fetches and collapses bursts of sync pushes.
  const fetchInFlightRef = useRef(false)
  const lastFetchAtRef = useRef(0)

  const fetchData = useCallback(async (silent = false) => {
    if (fetchInFlightRef.current) return
    fetchInFlightRef.current = true
    if (!silent) setLoading(true)
    try {
      // allSettled so one failing call (e.g. the requests endpoint) never blanks the
      // whole dashboard — render whatever succeeded.
      const [dashboardRes, rolesRes, requestsRes] = await Promise.allSettled([
        getAdminDashboard(50),
        getAdminRoles(),
        getAdminRequests(),
      ])

      if (dashboardRes.status === 'fulfilled') {
        setLogs(dashboardRes.value.logs)
        setSuspiciousUsers(dashboardRes.value.suspiciousUsers)
      }
      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value)
      if (requestsRes.status === 'fulfilled') setRequests(requestsRes.value)

      const failed: string[] = []
      if (dashboardRes.status === 'rejected') failed.push('logs/suspicious')
      if (rolesRes.status === 'rejected') failed.push('roles')
      if (requestsRes.status === 'rejected') failed.push('admin requests')

      const allFailed = failed.length === 3
      setError(allFailed ? 'Failed to load admin data.' : null)
      // Surface a partial failure instead of silently showing an empty section.
      setLoadWarning(!allFailed && failed.length > 0 ? `Couldn't load: ${failed.join(', ')}.` : null)
      if (!allFailed) setLastUpdated(new Date())
    } finally {
      fetchInFlightRef.current = false
      lastFetchAtRef.current = Date.now()
      if (!silent) setLoading(false)
    }
  }, [])

  // Keep ref in sync with latest fetchData
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  const runAction = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      setActionMessage(null)
      try {
        await action()
        setActionMessage(successMessage)
        await fetchData(true)
      } catch (err) {
        setActionMessage(err instanceof Error ? err.message : 'Action failed.')
      }
    },
    [fetchData],
  )

  const handleApprove = (request: AdminAccessRequest) =>
    runAction(async () => {
      await approveAdminRequest(request.id)
    }, `Approved admin access for ${request.username}.`)

  const handleReject = (request: AdminAccessRequest) =>
    runAction(async () => {
      await rejectAdminRequest(request.id)
    }, `Rejected admin access for ${request.username}.`)

  const handleBan = (email: string, reason: string) =>
    runAction(async () => {
      await banUser({ email, reason })
    }, `Banned ${email}.`)

  const handleUnban = (email: string) =>
    runAction(async () => {
      await unbanUser({ email })
    }, `Unbanned ${email}.`)

  const handleBanByEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!banEmail.trim()) {
      setActionMessage('Enter an email to ban.')
      return
    }
    void handleBan(banEmail.trim(), banReason.trim() || 'suspicious activity')
    setBanEmail('')
    setBanReason('')
  }

  // Banned status by email, derived from the synced store users.
  const bannedByEmail = new Map(
    state.users.filter((u) => u.banned).map((u) => [u.email.toLowerCase(), u]),
  )

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

  // Refresh when the WebSocket pushes new data — but throttle so a burst of broadcasts
  // (rapid logins/bans, or a running data generator) collapses into one refetch.
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || !lastSyncedAt) return
    if (Date.now() - lastFetchAtRef.current < 3000) return
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
        {(['logs', 'suspicious', 'requests', 'roles'] as Tab[]).map(t => {
          const pendingRequests = requests.filter(r => r.status === 'pending').length
          const label =
            t === 'logs' ? `Action Logs (${logs.length})`
            : t === 'suspicious' ? `Suspicious Users (${suspiciousUsers.length})`
            : t === 'requests' ? `Admin Requests (${pendingRequests})`
            : `Roles (${roles.length})`
          return (
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
            {label}
          </button>
          )
        })}
      </div>

      {actionMessage && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'var(--mc-surface, #1a1a2e)',
          border: '1px solid var(--mc-accent, #7c3aed)',
          fontSize: '0.85rem',
        }}>
          {actionMessage}
        </div>
      )}

      {loadWarning && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'var(--mc-surface, #1a1a2e)',
          border: '1px solid #f97316',
          color: '#f97316',
          fontSize: '0.85rem',
        }}>
          {loadWarning}
        </div>
      )}

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
              {/* Ban an arbitrary user by email */}
              <form
                onSubmit={handleBanByEmail}
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                  marginBottom: '20px',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'var(--mc-surface, #1a1a2e)',
                  border: '1px solid var(--mc-border, #2a2a3e)',
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 220px', fontSize: '0.8rem', opacity: 0.8 }}>
                  Email to ban
                  <input
                    type="email"
                    value={banEmail}
                    onChange={(e) => setBanEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="mc-input"
                    style={{ padding: '8px 10px', borderRadius: '6px' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '2 1 260px', fontSize: '0.8rem', opacity: 0.8 }}>
                  Reason
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="suspicious activity"
                    className="mc-input"
                    style={{ padding: '8px 10px', borderRadius: '6px' }}
                  />
                </label>
                <Button type="submit" variant="secondary">Ban user</Button>
              </form>

              {suspiciousUsers.length === 0 ? (
                <div className="mc-empty">No suspicious users detected.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {suspiciousUsers.map(user => {
                    const storeUser = state.users.find(u => u.id === user.userId)
                    const email = storeUser?.email
                    const isBanned = email ? bannedByEmail.has(email.toLowerCase()) : false
                    return (
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
                          {isBanned && (
                            <span style={{
                              display: 'inline-block', padding: '2px 10px', borderRadius: '9999px',
                              background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.75rem',
                            }}>BANNED</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{user.reason}</div>
                        {email && <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{email}</div>}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.5, whiteSpace: 'nowrap' }}>
                        <div>First seen: {formatDate(user.createdAt)}</div>
                        <div>Last updated: {formatDate(user.updatedAt)}</div>
                        {user.resolvedAt && <div style={{ color: '#22c55e' }}>Resolved: {formatDate(user.resolvedAt)}</div>}
                      </div>
                      {email && (
                        <div>
                          {isBanned ? (
                            <Button variant="ghost" onClick={() => void handleUnban(email)}>Unban</Button>
                          ) : (
                            <Button variant="secondary" onClick={() => void handleBan(email, user.reason)}>Ban</Button>
                          )}
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Admin Access Requests */}
          {tab === 'requests' && (
            <div>
              {requests.length === 0 ? (
                <div className="mc-empty">No admin access requests.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {requests.map(request => (
                    <div key={request.id} style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'var(--mc-surface, #1a1a2e)',
                      border: '1px solid var(--mc-border, #2a2a3e)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>{request.username}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{request.email}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '4px' }}>
                          Requested: {formatDate(request.createdAt)}
                          {request.resolvedAt && ` · Resolved: ${formatDate(request.resolvedAt)}`}
                        </div>
                      </div>
                      {request.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button onClick={() => void handleApprove(request)}>Approve</Button>
                          <Button variant="ghost" onClick={() => void handleReject(request)}>Reject</Button>
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-block', padding: '2px 12px', borderRadius: '9999px',
                          background: request.status === 'approved' ? '#22c55e' : '#6b7280',
                          color: '#fff', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase',
                        }}>{request.status}</span>
                      )}
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