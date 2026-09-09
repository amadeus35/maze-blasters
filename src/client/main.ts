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

import { setupDebugPanel } from './debug.js'
import { gameClient } from './game_loop.js'
import { attachInput } from './input.js'
import { connect } from './net.js'
import { setupCanvas } from './render.js'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas)
const hud = document.getElementById('hud') as HTMLElement

attachInput()
setupDebugPanel()

gameClient.init(ctx, hud)

function onStateUpdate() {
  console.log('Updating state...')
}

connect({
  onWelcome: gameClient.start,
  onStateUpdate,
})
