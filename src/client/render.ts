// Drawing only. This file must never change WorldState — if it does, your
// simulation now depends on whether a frame was rendered, and a server that
// renders nothing will diverge from a client that renders 144 times a second.

import { GRID_W, GRID_H, TILE_PX } from '../shared/constants.js'
import { Tile, type WorldState } from '../shared/types.js'
import { tileAt } from '../shared/sim.js'

const COLORS = {
  floor: '#1d2233',
  wall: '#39405c',
  block: '#7a5c3e',
  grid: '#161a28',
  self: '#5ce1a6',
} as const

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1
  canvas.width = GRID_W * TILE_PX * dpr
  canvas.height = GRID_H * TILE_PX * dpr
  canvas.style.width = `${GRID_W * TILE_PX}px`
  canvas.style.height = `${GRID_H * TILE_PX}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  ctx.scale(dpr, dpr)
  return ctx
}

/**
 * @param alpha  How far we are between the last completed tick and the next
 *               one, in the range [0, 1). Currently ignored — see EXERCISE 0.5.
 */
export function render(ctx: CanvasRenderingContext2D, world: WorldState, alpha: number): void {
  void alpha

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const t = tileAt(world, x, y)
      ctx.fillStyle = t === Tile.Wall ? COLORS.wall : t === Tile.Block ? COLORS.block : COLORS.floor
      ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX)
      ctx.strokeStyle = COLORS.grid
      ctx.strokeRect(x * TILE_PX + 0.5, y * TILE_PX + 0.5, TILE_PX - 1, TILE_PX - 1)
    }
  }

  for (const p of world.players.values()) {
    if (!p.alive) continue
    ctx.fillStyle = COLORS.self
    ctx.beginPath()
    ctx.arc((p.x + 0.5) * TILE_PX, (p.y + 0.5) * TILE_PX, TILE_PX * 0.34, 0, Math.PI * 2)
    ctx.fill()
  }

  // EXERCISE 0.5 — Use `alpha`.
  //   At 60Hz sim on a 144Hz monitor, most frames draw a world that has not
  //   changed since the last frame: motion looks subtly steppy. The fix is to
  //   draw the player between where they were at the previous tick and where
  //   they are now, `alpha` of the way along.
  //   That requires keeping the PREVIOUS tick's state around. Do it now, in
  //   single-player, where you can verify it by eye with no network involved —
  //   because in Phase 3 you will do exactly this again for remote players,
  //   and there you will not be able to tell interpolation bugs apart from
  //   network bugs.
}
