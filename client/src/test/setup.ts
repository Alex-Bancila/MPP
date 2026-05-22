import '@testing-library/jest-dom/vitest'

import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  const ResponsiveContainer = ({ width, height, children }: { width?: number | string; height?: number | string; children?: ReactNode | ((props: { width: number; height: number }) => ReactNode) }) => {
    const render = typeof children === 'function' ? (children as (props: { width: number; height: number }) => ReactNode)({ width: 400, height: 300 }) : children
    return createElement('div', { style: { width: width ?? 0, height: height ?? 0 } }, render)
  }
  return {
    ...actual,
    ResponsiveContainer,
  }
})

if (!('IntersectionObserver' in window)) {
  class IntersectionObserverMock {
    private callback: IntersectionObserverCallback

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }

    observe() {
      this.callback([], this as unknown as IntersectionObserver)
    }

    unobserve() {
      return undefined
    }

    disconnect() {
      return undefined
    }

    takeRecords() {
      return []
    }
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  })

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  })
}

if (!('WebSocket' in window)) {
  class WebSocketMock {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3

    readyState = WebSocketMock.OPEN

    addEventListener() {
      return undefined
    }

    removeEventListener() {
      return undefined
    }

    send() {
      return undefined
    }

    close() {
      this.readyState = WebSocketMock.CLOSED
    }
  }

  Object.defineProperty(window, 'WebSocket', {
    writable: true,
    configurable: true,
    value: WebSocketMock,
  })

  Object.defineProperty(globalThis, 'WebSocket', {
    writable: true,
    configurable: true,
    value: WebSocketMock,
  })
}
