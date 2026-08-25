// ============================================================================
// THE SERVER
// ============================================================================
// Two jobs, deliberately kept separate in your head:
//   1. A dumb static file host, so you can open the game in a browser.
//      (Scaffolding. Not the lesson. Never think about it again.)
//   2. A WebSocket endpoint that will, from Phase 1 onward, hold the ONE
//      authoritative simulation that all clients are approximations of.
//
// Right now job 2 does nothing but accept connections and say hello. That is
// correct for Phase 0: the game is single-player and runs entirely in the
// browser. Wiring the server before you understand the tick loop would mean
// debugging two unknowns at once.
// ============================================================================

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, type WebSocket } from 'ws'
import { PORT } from '../shared/constants.js'
import type { ClientMessage, ServerMessage } from '../shared/types.js'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
}


function isClientNodeModule(path: string){
  const modules = [
    'zod'
  ] as const
  for(const mod of modules){
    if(path.startsWith(`/node_modules/${mod}/`)){
      return true
    }
  }
  return false
}

// --- Job 1: static files ----------------------------------------------------
const http = createServer(async (req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0] ?? '/'
  const rel = urlPath === '/' ? 'public/index.html'
    : urlPath.startsWith('/dist/') || urlPath.startsWith('/src/') || isClientNodeModule(urlPath) ? urlPath.slice(1)
    : join('public', urlPath)

  const file = normalize(join(ROOT, rel))
  if (!file.startsWith(ROOT + sep)) { res.writeHead(403).end('forbidden'); return }

  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})

// --- Job 2: the game socket -------------------------------------------------
const wss = new WebSocketServer({ server: http })

let nextId = 1
const clients = new Map<string, WebSocket>()
const worldConfig = {
  seed:Math.ceil(Math.random() * 1000),
  blockLimit:50
}

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg))
}

wss.on('connection', (ws) => {
  const id = `p${nextId++}`
  clients.set(id, ws)
  console.log(`[ws] ${id} connected (${clients.size} online)`)

  send(ws, { t: 'welcome', id, tick: 0, worldConfig })

  ws.on('message', (raw) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(String(raw)) as ClientMessage
    } catch {
      return // Never trust the wire. A malformed frame must not kill the server.
    }

    // EXERCISE 1.1 — Receive inputs.
    //   Do NOT apply `msg.cmd` to the world here, the moment it arrives.
    //   That is the single most tempting mistake in this whole project.
    //   Applying on arrival means the world advances at the rate packets show
    //   up, which is jittery, unfair, and not reproducible. Instead: queue it,
    //   and let the tick loop below decide which tick it belongs to.
    void msg
  })

  ws.on('close', () => {
    clients.delete(id)
    console.log(`[ws] ${id} disconnected (${clients.size} online)`)
    // EXERCISE 5.1 — Does the player vanish instantly, or linger so they can
    // reconnect into the same body? A dropped WiFi packet and a rage-quit look
    // identical from here.
  })
})

// EXERCISE 1.2 — The authoritative tick loop.
//
//   setInterval(() => {
//     collect one InputCommand per player from their queues
//     step(world, inputs)
//     if (world.tick % SEND_EVERY_N_TICKS === 0) broadcast a 'state' message
//   }, TICK_MS)
//
// Three questions to settle before you write it:
//   - A player's queue is EMPTY this tick (their packet is late). Do you stall
//     the whole game, reuse their last input, or treat it as "no keys pressed"?
//     Each choice is a different kind of unfair.
//   - A player's queue has THREE inputs this tick (their packets bunched up).
//     Do you apply all three, apply one and keep two, or drop two?
//   - setInterval drifts. Over a minute at 60Hz you will not have run 3600
//     ticks. Does that matter? What in Phase 2 stops working if the server's
//     tick 500 and the client's tick 500 mean different wall-clock moments?

http.listen(PORT, () => {
  console.log(`\n  maze-blasters  ->  http://localhost:${PORT}\n`)
})
