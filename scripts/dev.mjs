// Dev runner: one process that supervises two child processes.
//   1. `tsc --watch`  -> recompiles src/*.ts into dist/ on every save
//   2. `node --watch` -> restarts the server whenever dist/ changes
// Zero dependencies on purpose. Nothing here is part of the lesson.
import { spawn } from 'node:child_process'

const isWin = process.platform === 'win32'
const npx = isWin ? 'npx.cmd' : 'npx'

const children = [
  spawn(npx, ['tsc', '--watch', '--preserveWatchOutput'], { stdio: 'inherit', shell: isWin }),
  spawn(process.execPath, ['--watch', '--watch-path', 'dist', 'dist/server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  }),
]

const shutdown = () => {
  for (const c of children) c.kill()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
