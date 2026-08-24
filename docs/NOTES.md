# Lab notebook

Answer these in your own words *before* you look anything up, then revise the answer
after you have built the thing. The gap between the two drafts is the actual learning,
and Phase 6's retrospective is mostly just re-reading this file.

Date each entry. Record wrong guesses — do not edit them out. A wrong guess you can
explain the death of is worth more than a right one you inherited.

---

## Phase 0 — Local foundations

- Why is a fixed timestep preferable to "update by delta time" once you add a network peer?
- What does the simulation need to be able to do that a purely render-driven game does not?
- How do I represent "the state of the world at tick N" as a distinct, snapshot-able thing?

**Decisions I made and why:**
- Movement model (cell-locked vs. free float overlapping cells):
- Where the destructible-block layout comes from (server-authored vs. shared seed):
- How a held bomb key is prevented from laying 60 bombs a second:

---

## Phase 1 — Dumb networking baseline

- Transport tradeoffs for *this* game specifically: WebSocket vs. raw UDP vs. WebRTC data channels.
- When did tick rate vs. send rate stop being an accident and become a decision?
- How bad does it concretely feel at 50ms / 150ms / 300ms? Write down the feeling, not the number.

**Decisions I made and why:**
- Late input queue empty on a tick →
- Three inputs bunched up on one tick →
- Serialization: `WorldState.players` is a `Map`, which `JSON.stringify` turns into `{}`. What did I do about it, and what else in `WorldState` does not survive the wire?

---

## Phase 2 — Client-side prediction

- What exactly is in the input/state buffer, and how far back does it go?
- Snap or smooth on divergence? What breaks with each?
- How do I replay local inputs after a correction without hand-rolling the game logic twice?
- Is bomb placement predicted, or does it wait for the server? Why might movement and bombs get different answers?

**Decisions I made and why:**

---

## Phase 3 — Remote entity interpolation

- Why is extrapolation riskier than interpolation for opponents?
- What am I deliberately paying to always render slightly in the past? How much?
- Does a remote player's bomb placement need the same treatment as their movement?

**Decisions I made and why:**
- Interpolation delay constant, and how I picked it:

---

## Phase 4 — Discrete events

- Should explosion resolution ever be predicted, or always server-only with a "may be undone" visual?
- Two bombs, two owners, same tick window, adjacent — how does every client resolve the chain identically?
- Policy when a client predicted "I dodged" and was wrong. How do I communicate it without rubber-banding?

**Decisions I made and why:**
- My total ordering rule for explosion resolution:

---

## Phase 5 — Edge cases and stress

- Minimum viable resync: does a reconnecting client replay history, or accept a fresh snapshot and lose predicted state?
- Where does my code implicitly assume packets arrive in order? Does that hold under loss?

**Decisions I made and why:**

---

## Phase 6 — Retrospective

For each of prediction, reconciliation, interpolation, and tick sync: what surprised me,
and what would I do differently starting over?
