# maze-blasters

A multiplayer Bomberman clone, built from scratch to learn netcode: fixed-timestep
simulation, client-side prediction, reconciliation, and entity interpolation.

The full curriculum lives in [`docs/PLAN.md`](docs/PLAN.md). Your answers to its
questions go in [`docs/NOTES.md`](docs/NOTES.md) — write them down as you go, because
Phase 6 is a retrospective and you will not remember what confused you on Day 2.

## Run it

```
npm install
npm run dev
```

Then open <http://localhost:8080>. `npm run dev` runs `tsc --watch` and a
self-restarting server side by side, so a save recompiles and reloads; refresh the
browser to pick up client changes.

| command | what it does |
| --- | --- |
| `npm run dev` | watch-compile + auto-restarting server (use this) |
| `npm run build` | one-shot compile to `dist/` |
| `npm start` | run the compiled server without watching |
| `npm run typecheck` | type-check without emitting |

## The stack, and why each piece is absent rather than present

- **`ws` and nothing else on the server.** No Express, no Socket.IO, no game framework.
  Socket.IO in particular would give you automatic reconnect and room management — and
  hide the exact failure modes Phase 5 exists to make you feel.
- **Canvas 2D, no renderer library.** Drawing is three `fillRect` calls. Nothing in the
  stack has an opinion about entities, interpolation, or the game loop, so every one of
  those is yours to write and yours to get wrong.
- **TypeScript, no bundler.** `tsc` emits plain ES modules that the browser loads
  natively, which is why imports in `.ts` files end in `.js` — that is the path the
  browser will actually request. Source maps are on: breakpoints land in your `.ts`.
- **`src/shared/` is compiled once and imported by both sides.** The client and server
  run *the same simulation code*. That is not a tidiness preference; prediction is only
  possible when the client can compute what the server is about to compute.

## Layout

```
src/shared/    the simulation + the vocabulary. Runs on BOTH client and server.
  constants.ts   numbers both sides must agree on exactly
  types.ts       WorldState, InputCommand, the wire protocol
  sim.ts         step(): advances the world by exactly one tick  <- the heart
src/server/
  index.ts       static file host + the authoritative game socket
src/client/
  main.ts        the fixed-timestep loop
  input.ts       keyboard -> InputCommand
  render.ts      WorldState -> pixels (never the reverse)
public/          index.html
```

## Where you are now

Phase 0, partly scaffolded. What works: the tick loop, input sampling, the grid, and
rendering — the full `input -> tick -> render` pipeline, proven end to end so that when
your own code misbehaves you already know the plumbing is not at fault. A WebSocket
connects and says hello, and carries no gameplay.

What does **not** work is everything the plan asks you to learn. Movement is a
deliberately throwaway four-liner with no collision. There are no blocks, no bombs, no
explosions, no server simulation.

Those gaps are marked in the source as `EXERCISE n.n`, numbered by the plan's phase:

```
grep -rn "EXERCISE" src/
```

Each one states the problem and the trap, and asks you the question you have to answer
yourself. None of them tells you the answer — where the plan says a decision is "the
actual exercise" (reconciliation algorithm, input buffer structure, explosion ordering,
interpolation delay, resync protocol), the comments deliberately stop at the question.

Start with `src/shared/sim.ts`, Exercise 0.1.

## Working with your teacher

Ask for the concept, the tradeoff, or a review of what you wrote — not the
implementation. Useful shapes:

- "Why does X work that way?" / "What breaks if I do Y instead?"
- "Here's my reconciliation approach — poke holes in it."
- "I'm stuck on Exercise 2.2. Give me a hint, not the code."
- "Compare my explosion ordering to how real engines solve it."

If you want an answer handed over, say so explicitly. Otherwise the default is hints,
questions, and review.

## License

MIT — see [LICENSE](LICENSE).
