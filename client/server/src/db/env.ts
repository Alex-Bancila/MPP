import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const loadEnvFile = (envPath: string, override: boolean): boolean => {
  if (!existsSync(envPath)) {
    return false
  }

  const result = config({ path: envPath, override })
  return !result.error && Boolean(process.env.DATABASE_URL)
}

const envCandidates = (): string[] => {
  const isTest = Boolean(process.env.VITEST) || process.env.NODE_ENV === 'test'

  return isTest
    ? [resolve(serverRoot, '.env.test'), resolve(serverRoot, '.env')]
    : [resolve(serverRoot, '.env'), resolve(serverRoot, '.env.test')]
}

export const loadServerEnv = (): void => {
  if (process.env.DATABASE_URL) {
    return
  }

  for (const envPath of envCandidates()) {
    if (loadEnvFile(envPath, false)) {
      return
    }
  }
}

export const loadServerTestEnv = (): void => {
  for (const envPath of [resolve(serverRoot, '.env.test'), resolve(serverRoot, '.env')]) {
    if (loadEnvFile(envPath, true)) {
      return
    }
  }
}
