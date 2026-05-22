import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_HEALTH = process.env.PLAYWRIGHT_SERVER_HEALTH_URL ?? 'http://127.0.0.1:3001/health'
const TIMEOUT = Number(process.env.PLAYWRIGHT_SERVER_WAIT_MS ?? 120_000)
const INTERVAL = 1000
const PID_FILE = path.resolve(__dirname, '.playwright-server.json')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function checkHealth(url: string): Promise<boolean> {
  try {
    // Node 18+ has global fetch
    const res = await fetch(url)
    if (!res.ok) return false
    const body = await res.json().catch(() => null)
    if (body && typeof body === 'object') {
      // Prefer postgres or ok
      if (body.postgres === true || body.ok === true) return true
      return false
    }
    return true
  } catch (err) {
    return false
  }
}

export default async function globalSetup() {
  console.log('[Playwright Setup] Starting backend server (npm run server:dev)')

  const child = spawn('npm', ['run', 'server:dev'], {
    shell: true,
    env: process.env,
    stdio: 'inherit',
  })

  const startedAt = Date.now()

  // Wait for health
  let healthy = false
  const deadline = Date.now() + TIMEOUT
  while (Date.now() < deadline) {
    healthy = await checkHealth(DEFAULT_HEALTH)
    if (healthy) break
    await sleep(INTERVAL)
  }

  if (!healthy) {
    console.error(`[Playwright Setup] Server did not become healthy within ${TIMEOUT}ms`)
    try {
      if (child.pid) {
        // Best-effort kill
        if (process.platform === 'win32') {
          spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: true })
        } else {
          process.kill(child.pid, 'SIGTERM')
        }
      }
    } catch (e) {
      // ignore
    }
    throw new Error('Server failed to become healthy')
  }

  // Persist PID for teardown
  try {
    fs.writeFileSync(PID_FILE, JSON.stringify({ pid: child.pid, startedAt, healthUrl: DEFAULT_HEALTH }, null, 2), 'utf8')
    console.log('[Playwright Setup] Wrote PID file to', PID_FILE)
  } catch (err) {
    console.warn('[Playwright Setup] Failed to write PID file:', err)
  }

  console.log('[Playwright Setup] Backend healthy, continuing with tests')
}
