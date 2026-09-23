/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import '@testing-library/jest-dom';

// Polyfill window.ResizeObserver for recharts / tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill WebSocket in jsdom test environment so Supabase Realtime doesn't trigger undici connection errors
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 1;
  onopen: any = null;
  onclose: any = null;
  onmessage: any = null;
  onerror: any = null;
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}

if (typeof window !== 'undefined') {
  (window as any).WebSocket = MockWebSocket;
}
(global as any).WebSocket = MockWebSocket;
