// Keyboard -> InputCommand.
//
// The important idea here is the boundary: the rest of the game NEVER asks
// "is the W key down?". It asks for an InputCommand. That indirection is what
// lets the same simulation run on a server that has no keyboard at all, and
// what lets you replay a recorded command during reconciliation.

import type { InputCommand } from '../shared/types.js'

const down = new Set<string>()

export function attachInput(target: Window = window): void {
  target.addEventListener('keydown', (e) => {
    down.add(e.code)
    if (e.code === 'Space') e.preventDefault() // stop the page scrolling
  })
  target.addEventListener('keyup', (e) => down.delete(e.code))
  target.addEventListener('blur', () => down.clear()) // alt-tab must not stick a key
}

let seq = 0

/**
 * Snapshot the keyboard as the intent for ONE tick.
 *
 * Called once per simulation tick — never once per rendered frame. If your
 * monitor is 144Hz and your sim is 60Hz, sampling per frame would feed the
 * simulation more inputs than there are ticks to consume them.
 */
export function sampleInput(): InputCommand {
  return {
    seq: seq++,
    up: down.has('KeyW') || down.has('ArrowUp'),
    down: down.has('KeyS') || down.has('ArrowDown'),
    left: down.has('KeyA') || down.has('ArrowLeft'),
    right: down.has('KeyD') || down.has('ArrowRight'),
    bomb: down.has('Space'),
  }
}
