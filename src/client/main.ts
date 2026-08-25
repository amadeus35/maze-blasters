// ============================================================================
// THE CLIENT
// ============================================================================
// Phase 0: everything runs here, in the browser, single-player. No socket is
// used for gameplay yet.
//
// The whole file is really about one shape — the fixed-timestep loop — so read
// that part slowly. It is the answer to the Phase 0 question "why is a fixed
// timestep preferable to update-by-delta-time once you add a network peer?",
// and the answer is visible in the code itself if you look for what is
// MISSING: `step()` never receives a delta time. It cannot. It advances the
// world by one indivisible, universally agreed-upon quantum. That is what
// makes "the world at tick 500" a thing two different machines can talk about.
// ============================================================================

import { TICK_MS } from '../shared/constants.js'
import { createWorld, addPlayer, step } from '../shared/sim.js'
import type {InputCommand, PlayerId, WorldState} from '../shared/types.js'
import { attachInput, sampleInput } from './input.js'
import { setupCanvas, render } from './render.js'
import {serverMessageSchema} from "../shared/schemas.js";

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas)
const hud = document.getElementById('hud') as HTMLElement

attachInput()

const LOCAL_ID: PlayerId = 'local'
let worldIsSet = false
const inputs = new Map<PlayerId, InputCommand>()

// --- The fixed-timestep loop ------------------------------------------------
// Real time arrives in irregular lumps (whatever gap requestAnimationFrame
// hands us). The accumulator converts those lumps into a whole number of
// equal-sized ticks and carries the remainder forward to the next frame.
// Nothing is ever lost and nothing is ever double-counted.

let previous = performance.now()
let accumulator = 0

function handleMessage(event: MessageEvent){
  const result = serverMessageSchema.safeParse(JSON.parse(event.data))
  if(!result.success){
    console.error(result.error)
    return
  }
  const message = result.data
  switch (message.t){
    case "welcome":
      if(!worldIsSet){
        const world = createWorld(message.worldConfig)
        console.log("world created")
        worldIsSet = true
        addPlayer(world, LOCAL_ID, 1, 1)
        function frame(now: number): void {
          requestAnimationFrame(frame)

          let elapsed = now - previous
          previous = now

          // Clamp. If the tab was backgrounded for 30 seconds, `elapsed` is 30000ms
          // and the loop below would try to run 1800 ticks in one frame, freeze, and
          // make `elapsed` even larger next frame. This is the classic "spiral of
          // death". Better to drop simulated time than to hang.
          if (elapsed > 250) elapsed = 250

          accumulator += elapsed

          while (accumulator >= TICK_MS) {
            inputs.set(LOCAL_ID, sampleInput())
            step(world, inputs)
            accumulator -= TICK_MS
          }

          render(ctx, world, accumulator / TICK_MS)
          hud.textContent = `tick ${world.tick}`
        }

        requestAnimationFrame(frame)
      }
      break
    case "state":
      console.log("Updating state...")
      break
    default:
      console.warn("Invalid message")
      console.log('[net]', JSON.parse(event.data as string))
  }
}

// --- The socket -------------------------------------------------------------
// Connected now purely so you can see the plumbing works (watch the server
// console). It carries no gameplay until Phase 1.
const ws = new WebSocket(`ws://${location.host}`)
ws.addEventListener('open', () => console.log('[net] connected'))
ws.addEventListener('message', (e) => handleMessage(e))
ws.addEventListener('close', () => console.log('[net] disconnected'))
