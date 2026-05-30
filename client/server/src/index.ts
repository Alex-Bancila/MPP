import { buildApp } from './app'

const start = async () => {
  console.log(`[Server] DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') ?? 'NOT SET'}`)
  const { app } = await buildApp()
  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  try {
    await app.listen({ port, host })
    console.log(`Server running on https://${host}:${port}`)
  } catch (error) {
    console.error('[Server] Failed to start:', error)
    process.exit(1)
  }
}

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason)
})

start()