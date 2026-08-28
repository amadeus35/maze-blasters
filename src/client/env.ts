// The client has no build step and no access to process.env. The static host
// (src/server/index.ts) injects `window.__MAZE_ENV__` into index.html based on
// the server's NODE_ENV. If the script is missing — e.g. the page was served by
// something other than our host — we assume production and expose nothing.

declare global {
  interface Window {
    __MAZE_ENV__?: 'dev' | 'prod'
  }
}

export const IS_DEV: boolean = window.__MAZE_ENV__ === 'dev'
