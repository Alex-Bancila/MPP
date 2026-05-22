import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store/useAppStore'
import { useAppSelector } from '@/app/store/useAppSelector'
import { getCategoryStats, getCurrentUser, getTopSellers } from '@/app/store/selectors'
import { CategoryBarChart } from '@/features/stats/components/CategoryBarChart'
import { CategoryPieChart } from '@/features/stats/components/CategoryPieChart'
import { GeneratorPanel } from '@/features/stats/components/GeneratorPanel'
import { StatsQuickAdd } from '@/features/stats/components/StatsQuickAdd'
import { StatsTablePane } from '@/features/stats/components/StatsTablePane'
import { TopSellersCard } from '@/features/stats/components/TopSellersCard'
import { getAdminDashboard, getAdminRoles } from '@/features/sync/serverClient'
import type { AdminActionLog, AdminDashboardData, AdminRole, AdminSuspiciousUser } from '@/features/sync/serverClient'
import { Tabs } from '@/shared/components/ui/Tabs'
import type { AppState, AppView } from '@/shared/types/domain'

const viewOptions: { value: AppView; label: string }[] = [
  { value: 'listings', label: 'Browse Listings' },
  { value: 'statistics', label: 'Statistics' },
]

const AdminSection = () => {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, roleList] = await Promise.all([getAdminDashboard(), getAdminRoles()])
        setDashboard(dash)
        setRoles(roleList)
      } catch {
        // Server unreachable; admin section stays empty
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <p className="mc-admin-section__loading">Loading admin data…</p>
  }

  return (
    <section className="mc-admin-section">
      <h2 className="mc-admin-section__title">Admin Dashboard</h2>

      <article className="mc-admin-card">
        <h3 className="mc-admin-card__title">Roles & Permissions</h3>
        <table className="mc-admin-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Description</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td>{role.description ?? '—'}</td>
                <td>{role.permissions.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="mc-admin-card">
        <h3 className="mc-admin-card__title">Audit Log</h3>
        {dashboard?.logs.length ? (
          <table className="mc-admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.logs.map((log: AdminActionLog) => (
                <tr key={log.id}>
                  <td>{log.username}</td>
                  <td>{log.role}</td>
                  <td>{log.action}</td>
                  <td>{log.details}</td>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mc-admin-card__empty">No audit entries yet.</p>
        )}
      </article>

      <article className="mc-admin-card">
        <h3 className="mc-admin-card__title">Suspicious Users</h3>
        {dashboard?.suspiciousUsers.length ? (
          <table className="mc-admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Reason</th>
                <th>Score</th>
                <th>Updated</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.suspiciousUsers.map((entry: AdminSuspiciousUser) => (
                <tr key={entry.id}>
                  <td>{entry.username}</td>
                  <td>{entry.role}</td>
                  <td>{entry.reason}</td>
                  <td>{entry.score}</td>
                  <td>{new Date(entry.updatedAt).toLocaleString()}</td>
                  <td>{entry.resolvedAt ? new Date(entry.resolvedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mc-admin-card__empty">No suspicious activity detected.</p>
        )}
      </article>
    </section>
  )
}

export const StatsPage = () => {
  const navigate = useNavigate()
  const { dispatch } = useAppStore()

  const listings = useAppSelector((state) => state.listings)
  const users = useAppSelector((state) => state.users)
  const reviews = useAppSelector((state) => state.reviews)
  const currentUserId = useAppSelector((state) => state.currentUserId)

  const statsState = useMemo(
    () => ({ listings, users, reviews, currentUserId } as AppState),
    [currentUserId, listings, reviews, users],
  )

  const categoryRows = useMemo(() => getCategoryStats(statsState), [statsState])
  const topSellers = useMemo(() => getTopSellers(statsState), [statsState])
  const currentUser = useMemo(() => getCurrentUser(statsState), [statsState])
  const isAdmin = currentUser?.permissions?.includes('admin:read') ?? false

  const updateView = (nextView: AppView) => {
    dispatch({
      type: 'activity/set',
      payload: { preferredView: nextView },
    })

    if (nextView === 'listings') {
      navigate('/listings')
    }
  }

  return (
    <section className="mc-page mc-stats-page">
      <div className="mc-listings-page__view-toggle">
        <Tabs value="statistics" onChange={updateView} options={viewOptions} />
      </div>

      <div className="mc-stats-layout mc-stats-layout--gold">
        <StatsTablePane rows={categoryRows} />

        <div className="mc-stats-page__charts">
          <article className="mc-stats-card">
            <h2 className="mc-stats-card__title">Listings by Category</h2>
            <CategoryPieChart data={categoryRows} />
          </article>

          <article className="mc-stats-card">
            <h2 className="mc-stats-card__title">Average Price by Category</h2>
            <CategoryBarChart data={categoryRows} />
          </article>
        </div>
      </div>

      <TopSellersCard rows={topSellers} />

      <StatsQuickAdd />
      <GeneratorPanel />

      {isAdmin && <AdminSection />}
    </section>
  )
}
