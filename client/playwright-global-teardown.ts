import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PID_FILE = path.resolve(__dirname, '.playwright-server.json')

function fileExists(p: string) {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

export default async function globalTeardown() {
  if (!fileExists(PID_FILE)) {
    console.log('[Playwright Teardown] No PID file found, nothing to do')
    return
  }

  let payload: { pid?: number } | null = null
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf8')
    payload = JSON.parse(raw)
  } catch (err) {
    console.warn('[Playwright Teardown] Failed to read PID file:', err)
  }

  if (!payload?.pid) {
    console.log('[Playwright Teardown] No pid in PID file, removing file')
    try { fs.unlinkSync(PID_FILE) } catch {}
    return
  }

  const pid = payload.pid
  console.log('[Playwright Teardown] Killing backend process pid=', pid)

  try {
    if (process.platform === 'win32') {
      // taskkill to ensure child processes are terminated
      spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { shell: true, stdio: 'inherit' })
    } else {
      try { process.kill(pid, 'SIGTERM') } catch {}
      // wait a bit
      await new Promise((r) => setTimeout(r, 1000))
      try { process.kill(pid, 0); process.kill(pid, 'SIGKILL') } catch {}
    }
  } catch (err) {
    console.warn('[Playwright Teardown] Failed to kill process:', err)
  }

  try { fs.unlinkSync(PID_FILE) } catch (err) { /* ignore */ }
  console.log('[Playwright Teardown] Teardown complete')
}
