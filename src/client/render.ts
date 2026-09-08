// Drawing only. This file must never change WorldState — if it does, your
// simulation now depends on whether a frame was rendered, and a server that
// renders nothing will diverge from a client that renders 144 times a second.

import {GRID_W, GRID_H, TILE_PX, PLAYER_HALF_W} from '../shared/constants.js'
import {type TileCoordinatePoint, Tile, type WorldState} from '../shared/types.js'
import {tileAt, tileHasBomb} from '../shared/sim.js'
import { getHitbox } from '../shared/player_helpers.js'
import { debugFlags } from './debug.js'

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
 * @param ctx
 * @param world
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
      if(tileHasBomb(world, [x, y])){
        const rx = (x + 0.5) * TILE_PX
        const ry = (y + 0.5) * TILE_PX
        drawBomb(ctx, [rx, ry], TILE_PX * 0.25)
      }
    }
  }

  for (const p of world.players.values()) {
    if (!p.alive) continue
    ctx.fillStyle = COLORS.self
    ctx.beginPath()
    ctx.arc(p.x * TILE_PX, p.y * TILE_PX, TILE_PX * PLAYER_HALF_W, 0, Math.PI * 2)
    ctx.fill()
  }

  if (debugFlags.showHitbox) {
    drawHitboxOverlay(ctx, world)
    drawPlayerOrigins(ctx, world)
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

// ---------------------------------------------------------------------------
// DEV-only debug overlay
// ---------------------------------------------------------------------------

const HITBOX_STROKE = '#ff5c8a'
const HITBOX_CELL_FILL = 'rgba(255, 92, 138, 0.16)'
const HITBOX_LABEL = '#ffb3cd'

const HITBOX_FONT_PX = 14
const HITBOX_LINE_PX = HITBOX_FONT_PX + 4

/**
 * Draws, for every player, the four corners getHitbox() produces and the grid
 * cell each one floors into — i.e. exactly the four cells wouldCollide() tests.
 * If the pink box is not concentric with the green player circle, that offset
 * is your collision bug, not the tile lookup.
 */
function drawHitboxOverlay(ctx: CanvasRenderingContext2D, world: WorldState): void {
  ctx.save()
  ctx.font = `${HITBOX_FONT_PX}px ui-monospace, monospace`
  ctx.textBaseline = 'top'

  for (const p of world.players.values()) {
    if (!p.alive) continue

    const hb = getHitbox([p.x, p.y])
    const corners: ReadonlyArray<readonly [string, readonly [number, number]]> = [
      ['TL', hb.topLeft],
      ['TR', hb.topRight],
      ['BR', hb.bottomRight],
      ['BL', hb.bottomLeft],
    ]

    // The cells the corners land in (what wouldCollide() reads).
    ctx.fillStyle = HITBOX_CELL_FILL
    for (const [, [gx, gy]] of corners) {
      ctx.fillRect(Math.floor(gx) * TILE_PX, Math.floor(gy) * TILE_PX, TILE_PX, TILE_PX)
    }

    // The hitbox rectangle.
    ctx.strokeStyle = HITBOX_STROKE
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(hb.topLeft[0] * TILE_PX, hb.topLeft[1] * TILE_PX)
    ctx.lineTo(hb.topRight[0] * TILE_PX, hb.topRight[1] * TILE_PX)
    ctx.lineTo(hb.bottomRight[0] * TILE_PX, hb.bottomRight[1] * TILE_PX)
    ctx.lineTo(hb.bottomLeft[0] * TILE_PX, hb.bottomLeft[1] * TILE_PX)
    ctx.closePath()
    ctx.stroke()

    // A dot on each corner.
    ctx.fillStyle = HITBOX_STROKE
    for (const [, [gx, gy]] of corners) {
      ctx.beginPath()
      ctx.arc(gx * TILE_PX, gy * TILE_PX, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // All four coordinates, listed next to the top-right corner.
    ctx.fillStyle = HITBOX_LABEL
    const textX = hb.topRight[0] * TILE_PX + 6
    const textY = hb.topRight[1] * TILE_PX
    corners.forEach(([name, [gx, gy]], i) => {
      ctx.fillText(`${name} ${gx.toFixed(2)},${gy.toFixed(2)}`, textX, textY + i * HITBOX_LINE_PX)
    })
  }

  ctx.restore()
}

function drawPlayerOrigins(ctx: CanvasRenderingContext2D, world: WorldState){
  ctx.save()
  ctx.fillStyle = "yellow"
  for(const player of world.players.values()){
    if (!player.alive) continue
    ctx.beginPath()
    ctx.arc(player.x * TILE_PX, player.y * TILE_PX, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawBomb(ctx: CanvasRenderingContext2D, [cx, cy]: TileCoordinatePoint, radius: number){
  ctx.save()

  // Body
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = "black"
  ctx.fill()
  ctx.closePath()

  // Fuse cap
  const capHeight = -radius * 0.4
  const rx = cx - (radius / 2)
  const ry = cy - (radius * 0.85)
  ctx.fillRect(rx, ry, radius, capHeight) // (x, y, width, height)


  // Fuse
  const firstPtY = cy - radius - Math.abs(capHeight)
  const secondPtY = firstPtY - radius * 0.5
  const offset = ry - (cy - radius)
  ctx.beginPath()
  ctx.strokeStyle = "brown"
  ctx.lineWidth = radius * 0.10
  ctx.moveTo(cx, firstPtY + offset) // (x, y)
  ctx.lineTo(cx, secondPtY)
  ctx.stroke()

  ctx.restore()
}
