import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, parseJson } from '../../test/testUtils'

describe('generator routes', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('starts and stops the generator', async () => {
    const startResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation StartGenerator($batchSize: Int, $intervalMs: Int, $entityType: String) {
          startGenerator(batchSize: $batchSize, intervalMs: $intervalMs, entityType: $entityType) {
            running
          }
        }`,
        variables: {
          batchSize: 1,
          intervalMs: 500,
          entityType: 'listings',
        },
      },
    })

    expect(startResponse.statusCode).toBe(200)

    const startBody = parseJson<{ data: { startGenerator: { running: boolean } } }>(startResponse.payload)
    expect(startBody.data.startGenerator.running).toBe(true)

    const stopResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `mutation StopGenerator {
          stopGenerator {
            running
          }
        }`,
      },
    })

    expect(stopResponse.statusCode).toBe(200)

    const stopBody = parseJson<{ data: { stopGenerator: { running: boolean } } }>(stopResponse.payload)
    expect(stopBody.data.stopGenerator.running).toBe(false)
  })
})
