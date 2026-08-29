# Exercise 0.2 guide — real grid movement with wall collision

Scope: this covers only Exercise 0.2 (`src/shared/sim.ts:135`). Bomb placement
(0.3) and explosions (0.4) are separate exercises — don't let them creep in yet.

This is a guide, not a solution. It's questions and concepts to work through
in your own order, referencing exact spots in the code so you don't have to
go hunting. Nothing here is pseudocode you can transcribe.

> **Working copy.** This is the `docs/` copy of `~/Downloads/exercise-0.2-guide.md`,
> annotated with answers worked out in a Socratic session. `> **Answered:**`
> blocks are session output; `> **Open:**` blocks are where we paused.

---

## 1. Recap the actual question

The exercise comment (`sim.ts:135-141`) already names the real fork in the
road:

> is a player AT a cell, or at a float position that OVERLAPS cells?

Cell-locked means a player only ever occupies one grid cell at a time —
movement is "am I allowed to step into the next cell," resolved once you
fully commit to it. Free-float-overlap means a player's position is
continuous and can straddle a cell boundary at any moment — mid-step between
two tiles is a normal, valid state, not a transitional one you snap out of.
Classic Bomberman is the second — that's what gives you the wall-slide and
corner-nudge feel — but it's the harder one to keep deterministic.

`docs/NOTES.md:18-21` already has a slot waiting for this decision. Before
you write more movement code, answer it in writing there: which model, and
*why* — what specifically about how you want the game to feel made you pick
it. You'll thank yourself in the Phase 6 retro when you've forgotten the
reasoning.

> **Answered:**
>
> - **Model:** free-float overlapping cells (already recorded at `NOTES.md:19`).
> - **Q — a moment where free-float beats cell-locked:** with a sub-tile
>   hitbox the player glides until their *box edge* touches a wall and stops
>   at a fractional position (flush stop). Cell-locked can only ever stop on
>   an integer cell. The other real differentiator is the corner case, below.
> - **Q — holding up+right, wall to the right, floor above:** the blocked
>   axis (right) is cancelled; the player keeps moving up, because that's the
>   only free direction they're actively pressing. Noted that *both* models
>   can do this "cancel the blocked axis" behaviour — it is not the
>   differentiator.
> - **Q — what does free-float cost you?** Determinism. Float drift is the
>   named danger. The same `step()` must produce bit-identical results on the
>   server, on client prediction, and on reconciliation replay; free-float
>   gives that more surface area to break.
> - **Q — `p.x` center or corner?** It's a *convention you choose*, not a
>   fact. Picked **Convention B: `p.x` is the box's left/top edge** (a
>   corner), fewer distinct expressions to fumble, and it matches what
>   `render.ts:50` already does. Caveat: `render.ts` centers the circle at
>   `p.x + 0.5`, which only equals convention B if the player is exactly
>   1×1 — and the circle drawn has radius `0.34` (width `0.68`), so that line
>   is currently inconsistent with itself.
>
> **Open:**
>
> - `NOTES.md:19` still lists only the upside. Add the cost (float drift →
>   bit-identical `step()` on server / prediction / replay) before moving to
>   0.3.
>
> **Answered (confirmed in code, not discussed live this session):**
> `NOTES.md:19` now states the cost — float drift, and that it makes client
> prediction and reconciliation harder — alongside the upside. Closed.

## 2. Point vs. box

Look at `PlayerState` in `src/shared/types.ts:35-41`. It's `{ id, x, y,
alive }` — a single point, nothing else. No width, no height, no radius.
"Hitbox" isn't a real concept in the sim yet; there's nothing to have an
extent.

Questions to sit with, not answer here:

- Where should that extent live? A shared constant everyone uses (like
  `GRID_W`/`GRID_H` in `constants.ts`), or a field on `PlayerState` itself?
  What would ever make it per-player instead of global?
- What size makes sense? The grid is 1 unit per tile, and both `Wall` and
  `Block` tiles (`types.ts:9-16`) are exactly 1 tile wide. If your hitbox is
  a full 1x1 tile, what happens to movement near any 1-tile-wide gap?
- `render.ts` already drew something — a circle of radius roughly 0.34 grid
  units, centered on the player. Is that a coincidence of "looked about
  right," or should collision agree with whatever number you pick there? Are
  you even required to keep them in sync?

> **Answered:**
>
> - **Must the collision box match the render circle?** No, not required —
>   but if they disagree the player can't judge their own spacing, so they
>   should agree. Conclusion: `render.ts:50`'s `0.34` should *derive from*
>   the new shared constant, not be its own magic number.
> - **Size:** a full `1.0`-wide box means the player must line up perfectly
>   to pass a 1-tile gap. Start at `0.5` and tune — too big makes 1-tile gaps
>   fiddly, too small makes them trivial.
> - **Where it lives:** a constant in `constants.ts` for now. Move it onto
>   `PlayerState` only if the game later adds items that resize a player or
>   differently-sized player models.
>
> **Open:**
>
> - Is `0.5` the **full width** or the **half-extent** (`h`, center-to-edge)?
>   Name the constant so it can't be misread (`PLAYER_HALF` vs
>   `PLAYER_SIZE`) — this ambiguity is a classic off-by-2× collision bug.
>
> **Answered (confirmed in code, not discussed live this session):**
> `constants.ts` names it `PLAYER_HALF_W = 0.25` — unambiguous, it's the
> half-extent. `render.ts:52` and `player_helpers.ts` both consume it
> directly rather than re-deriving their own number. Closed.

## 3. Bridging float position and integer tiles

Read `tileAt`'s actual contract (`sim.ts:25-30`): it takes `x`/`y` and does
`y * GRID_W + x` as a raw array index. There's no rounding, no validation —
it expects integers because it *is* an integer lookup. Out-of-bounds reads
come back as `Wall` on purpose, so callers never need their own bounds
checks.

The mismatch you found — `tileAt` wants integers, `player.x`/`player.y` are
fractional — isn't a bug to route around. It's telling you that *something*
has to sit between "continuous player position" and "which tile(s) does that
touch," and you haven't written that something yet.

Once you've given the player any extent at all (section 2), the harder
version of the question is: how many tiles can that box be touching at once?
A point touches exactly one tile. A box positioned exactly on a tile
boundary — what's the maximum number of tiles it could be overlapping
simultaneously, and does your answer change near a corner versus near a flat
edge? What has to be true for a collision check to be *correct* at that
moment, versus just correct most of the time?

> **Answered:**
>
> - **Tiles overlapped** by the `0.5`-wide box (`h = 0.25`): center mid-tile
>   → 1; center on a tile boundary → 2; center on the point where four tiles
>   meet → 4. **Max is 4** while the hitbox is ≤ 1×1. A box wider than 1.0
>   can straddle 3 tiles per axis and you'd have to check interior tiles too,
>   not just corners.
> - **So a full check is up to 4 `tileAt` calls**, one per box corner, each
>   coordinate `floor`ed.
> - **The 4 corners**, center `(cx, cy)`, half-extent `h`:
>   `(cx - h, cy - h)`, `(cx + h, cy - h)`, `(cx + h, cy + h)`, `(cx - h, cy + h)`.
> - **Single-axis move** only needs the 2 leading-edge corners — e.g. moving
>   right, check `(cx + h, cy - h)` and `(cx + h, cy + h)`.
> - **Flush-contact case:** moving right, this tick's move puts the right
>   edge at exactly `x = 4.0`, and column 4 is a wall. `floor(4.0) = 4`, so
>   the check reports a wall — even though the box is only *touching* tile 4,
>   not overlapping it. Result: the player gets stuck and can't rest against
>   the wall. (First proposed fix "push back to 3.9" is wrong — with
>   `h = 0.25` that puts the right edge at `4.15`, i.e. *inside* the wall.)
>
> **Open — Q13:** the snap target is *derived*, not picked. Moving right,
> blocked by column `W`: flush center is `W - h`. Moving left, blocked by
> column `W`: flush center is `W + 1 + h`. (Confirm and write the `y` forms.)
>
> **Open — Q14:** after snapping flush, the right edge is exactly `4.0` and
> `floor(4.0)` still returns `4`, so "blocked" re-fires next tick. Two
> consistent ways out:
> - **(a)** keep `floor`; "blocked" re-fires every tick but resolves to
>   "snap to `W - h`" — where the player already is. Stable no-op, slightly
>   wasteful.
> - **(b)** count a tile as occupied only on *penetration*: leading-edge tile
>   is `ceil(right) - 1`, not `floor(right)`. Right edge `4.0` → tile `3`
>   (flush is legal); right edge `4.0001` → tile `4` (blocked).
>
>   Pick one, and check it gives the same answer on server and on
>   reconciliation replay.
>
> **Answered (this session) — resolved by avoidance, not by picking (a) or
> (b):**
>
> - The actual implementation (`wouldCollide` in `sim.ts:46`) checks the box
>   at the *intended* position and refuses the move outright if any corner
>   floors into a non-`Floor` tile. The player is never allowed to reach a
>   position where `floor(edge) == W` in the first place, so the
>   flush-boundary ambiguity Q13/Q14 worried about never comes up.
> - **Tradeoff to note:** movement happens in fixed `SPEED` (0.08) jumps, and
>   a blocked tick simply doesn't move the player at all. So the resting
>   edge can land anywhere in `[W - SPEED, W)` — not flush, and not a fixed
>   distance from the wall. Not necessarily a problem, but a deliberate
>   trade for skipping the snap-to-flush math. Revisit if flush contact ends
>   up mattering for feel.

## 4. The determinism constraint

The exercise comment is explicit: bit-identical results from identical
inputs, and float drift is the named danger. `sim.ts`'s file header
(`sim.ts:1-20`) explains why this isn't optional — the same `step()` runs on
the server, on your client predicting ahead, and again during reconciliation
replay. If it can produce two different answers from the same inputs on two
runs, prediction and reconciliation both break before you've even built
them.

Don't try to solve this abstractly — ask, for whatever model you picked in
section 1: where in your movement logic could two machines (or two runs on
the same machine) legitimately disagree? Order of operations on the two
axes? A comparison that's sensitive to tiny floating-point differences?
You're not looking for a general fix, just for where in *your* code the risk
actually lives.

> **Open — not started.** Next session. Leading candidate: the order you
> resolve the two axes (X-then-Y vs Y-then-X) must be fixed and identical
> everywhere, because near a corner the two orders give different final
> positions.
>
> **Answered (this session) — confirmed concretely, not just as a leading
> candidate.** Full trace is in Section 5: resolving X-first vs. Y-first
> through the same diagonal-corner scenario produces two different final
> resting positions. The order genuinely changes the outcome; it must be
> fixed and identical on server, client prediction, and reconciliation
> replay.
>
> **Open:** which order, and is there a principled reason to prefer one — or
> is it "arbitrary, but fixed" (also a legitimate answer, if you argue it)?

## 5. Corners

Go try this by hand, no code yet: imagine walking diagonally (up + left)
straight into the corner of a wall tile. What do you want to happen? Full
stop? Slide along one wall? Which one, and does it depend on which side of
the corner you approach from?

Once you know what you want, look at what information your current check
has available to make that call. You already split `playerXIntention` and
`playerYIntention` apart (in the throwaway code) instead of moving on a
single combined vector — sit with why that split might matter more once
walls are real, and what it would take for your collision check to use each
one separately rather than only checking the combined destination.

> **Answered (partial):**
>
> - This split into two decisions:
>   - **Corner *nudge* assist** (snapping the player the last fraction of a
>     unit to round a corner they're almost aligned with) — quality-of-life,
>     **deferred**. The decision lives in this section but the work comes
>     later.
>   - **What happens when *both* axes are blocked** (diagonal straight into a
>     corner) — **not deferrable**. The axis-handling code will do something
>     regardless; decide on purpose whether it's a full stop or a slide along
>     one wall.
>
> **Open:** make the both-axes-blocked call and note which axis wins.
>
> **Answered (this session) — found a real bug in the current code by
> tracing it:**
>
> - Traced the Section 1 promise ("holding up+right, wall only on the
>   right, floor above → right cancels, up continues") against the actual
>   code, and it does **not** hold. `step()` computes `playerXIntent` and
>   `playerYIntent` together and calls `wouldCollide` once on the *combined*
>   box (`sim.ts:164`) — one blocked/clear answer for both axes at once. If
>   right alone would collide, up gets cancelled too, even though up alone
>   is clear. Contradicts the Section 1 decision.
> - Tried the obvious fix — check X and Y independently, each against the
>   box at the CURRENT (not intended) other-axis coordinate — and traced it
>   against a true diagonal-corner case (wall diagonally right+down, open
>   floor directly right, open floor directly below, player pressing
>   right+down). Both independent checks report "clear," but the combined
>   box overlaps the wall. Pure independent checking lets the player clip
>   through the corner. So neither "always combined" nor "always
>   independent-vs-original" is correct alone.
> - Tried **sequential resolution** instead: commit the first axis to the
>   real position if its solo check is clear, THEN check the second axis
>   against that just-updated position (not the original). Traced X-then-Y
>   and Y-then-X through the same diagonal-corner case and got two
>   *different* final resting positions — this is where Section 4's
>   determinism concern stopped being abstract.
>
> **Open:** is "which axis wins a diagonal-corner slide" actually a separate
> decision from axis-resolution order, or the same decision wearing two
> names? Answer that, then implement the sequential per-axis resolve in
> `step()`, replacing the single combined `wouldCollide` call at
> `sim.ts:164`.

## 6. Self-check checklist

Not automated tests — just questions to ask yourself once you think you're
done:

- Can you walk right up flush against a wall and stop cleanly, without
  jittering or getting pushed back?
- Given whatever hitbox size you picked, can a player fit through a 1-tile
  gap between two walls? Should they be able to?
- Does walking diagonally into a corner match the behavior you decided you
  wanted in section 5?
- If you feed the exact same sequence of inputs into `step()` twice from the
  same starting `WorldState`, do you get the exact same resulting position
  both times?

> **Open — not started.** Run once the code exists.

---

When you've made the movement-model call in section 1, write it and the
reasoning into `docs/NOTES.md` before moving on to Exercise 0.3. That's the
artifact Phase 6 asks you to look back on.

---

## Session pause — where to pick up

1. ~~Q13 / Q14~~ — resolved by avoidance (Section 3): the implementation
   never lets the box reach the flush boundary, so the snap-target math is
   moot. Tradeoff noted: resting gap isn't fixed, up to one `SPEED` short of
   flush.
2. Answer Section 5's new open question: is "which axis wins a
   diagonal-corner slide" the same decision as axis-resolution order, or
   separate?
3. Commit to an axis order (X-first or Y-first) for Section 4 —
   arbitrary-but-fixed is a fine answer, but write down that it's arbitrary
   if that's the call.
4. Implement the sequential per-axis resolve in `step()`: commit axis A to
   the real position if its solo check (against the CURRENT other axis) is
   clear, then check axis B against the just-updated position, not the
   original. Replaces the single combined `wouldCollide` call at
   `sim.ts:164`.
5. ~~Update `render.ts:50` to derive its radius from the new hitbox
   constant~~ — done; it already reads `PLAYER_HALF_W` (`render.ts:52`).
6. ~~Update `NOTES.md:19` with the cost side of the free-float decision~~ —
   done; the entry already names float drift and prediction/reconciliation
   difficulty as the cost.
7. **Section 6** — run the self-check once the sequential resolve lands.
