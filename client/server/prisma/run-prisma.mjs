import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'

const prismaDir = dirname(fileURLToPath(import.meta.url))
const serverRoot = resolve(prismaDir, '..')
const clientRoot = resolve(serverRoot, '..')

for (const envPath of [resolve(serverRoot, '.env'), resolve(clientRoot, '.env')]) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false })
  }
}

const prismaCli = resolve(clientRoot, 'node_modules', 'prisma', 'build', 'index.js')
const child = spawn(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: clientRoot,
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
