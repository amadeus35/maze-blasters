# Bomberman Multiplayer Clone — 2-Week Learning Plan

**Goal:** Not "ship a polished game." Goal is to *personally feel* why netcode is hard by building the naive version first, watching it break, then fixing it deliberately. Every phase below ends with an artifact you can point at and say "this is bad because X" before you fix X in the next phase.

**Assumption:** ~2–3 focused hours/day, 14 days. Adjust pacing to your actual availability — the phase order matters more than the day count.

---

## The "Why" — Read This Before You Write Code

Skip the code for now and internalize the core tension, because every decision you'll make later traces back to it:

- **Physics wants determinism.** Same inputs, same world state, same outputs, every time — on every machine.
- **Networks are not deterministic.** Packets arrive late, out of order, or not at all. Two players' inputs never arrive "at the same time" from the server's point of view.
- **Players want zero-latency feel.** They expect their own character to move the instant they press a key, not 100ms later when the server confirms it.

Client-side prediction, reconciliation, and interpolation are not "features" — they are three different patches over the same wound: *the player's local reality and the server's authoritative reality are never quite the same thing, and you have to decide, per-entity and per-moment, which one to trust and how to hide the seam.*

Bombs make this concrete: an explosion is a discrete event with a blast radius that must resolve identically on server and all clients, at a moment nobody agrees on down to the millisecond. That's your whole thesis project in one game mechanic.

---

## Phase 0 — Local Foundations (Day 1–2)
**No networking yet.** Build the game as a single-player, tick-based simulation.

**Learning goal:** Understand *why* tick-based simulation exists before you have a network partner forcing it on you.

**Build:**
- Fixed-timestep game loop (decoupled from render framerate)
- Grid movement, wall collision, bomb placement, timed explosion, chain reactions, player death
- All game state advances only inside discrete simulation ticks — no "just move the sprite" logic

**Questions to answer yourself before moving on:**
- Why is a fixed timestep preferable to "update by delta time" once you add a network peer?
- What does your simulation need to be able to do that a purely visual/render-driven game doesn't? (Hint: think about replaying or re-running ticks.)
- How will you represent "the state of the world at tick N" as a distinct, snapshot-able thing?

---

## Phase 1 — Dumb Networking Baseline (Day 3–4)
**Learning goal:** Feel the lag. Don't fix anything yet — this phase exists so Phase 2–3 have a "before" to compare against.

**Build:**
- Authoritative server holding the real simulation
- Clients send raw inputs to server; server simulates and broadcasts resulting state
- Clients render *only* what the server tells them, with zero prediction

**Questions to answer yourself:**
- Pick your transport (WebSocket, raw UDP, WebRTC data channels, etc.) — what tradeoffs does each make for a game like this specifically?
- At what point does your tick rate vs. your network send rate become a design decision rather than an accident?
- Artificially throttle/delay your own connection (there are tools for this) — how bad does it feel, concretely, at 50ms/150ms/300ms?

---

## Phase 2 — Client-Side Prediction (Day 5–7)
**Learning goal:** The core reconciliation problem — the client and server *will* disagree, and you need a strategy for what happens when they do.

**Build:**
- Local player moves instantly on input, without waiting for server confirmation
- Client keeps a buffer of recent inputs/states
- When server state arrives, reconcile: detect divergence and correct

**Questions to answer yourself (this is the heart of the exercise, take your time):**
- What exactly do you store in your input/state buffer, and how far back?
- When the server's authoritative position disagrees with your predicted position, do you snap, or smooth the correction? What breaks with each choice?
- How do you replay/re-simulate local inputs after a correction without redoing *all* your game logic by hand?
- What happens to bomb placement — is it predicted locally too, or does it wait for server confirmation? Why might those have different answers?

---

## Phase 3 — Remote Entity Interpolation (Day 8–9)
**Learning goal:** Prediction is for *your* player. Other players are a different problem entirely.

**Build:**
- Remote players render smoothly between the last two known server states, rather than teleporting on each update

**Questions to answer yourself:**
- Why is extrapolation (guessing forward) riskier than interpolation (smoothing between two known-past states) for opponents?
- What's the cost of interpolation — what are you deliberately choosing to always be looking slightly into the past for?
- Does a remote player's bomb placement need the same interpolation treatment as their movement? Why or why not?

---

## Phase 4 — Synchronizing Discrete Events (Day 10–11)
**Learning goal:** Continuous state (position) and discrete events (explosions, death, pickups) need different handling. This is where most naive netcode implementations quietly break.

**Build:**
- Bomb timers, explosion resolution, chain reactions, and player death fully synchronized and consistent across server and all clients
- Handle the "I saw myself die but the server disagreed" / "I predicted a bomb explosion that got contested" cases

**Questions to answer yourself:**
- Should explosion resolution ever be predicted client-side, or always be server-authoritative-only with a visual/audio "may be undone" state?
- Two bombs from two different players go off within the same tick window near each other — how do you guarantee every client resolves the chain reaction identically?
- What's your policy when a client's predicted outcome (e.g., "I dodged the blast") is wrong? How do you communicate that without it feeling like a rubber-band?

---

## Phase 5 — Edge Cases & Stress (Day 12–13)
**Learning goal:** Real networks aren't just "laggy," they're actively hostile — packet loss, jitter, disconnects, reconnects, late joiners.

**Build / test (pick based on what you have time for):**
- Simulated packet loss and jitter, not just fixed delay
- Player disconnect mid-round and reconnect/rejoin
- Late-joining spectator or player receiving full state sync

**Questions to answer yourself:**
- What's your minimum viable "resync" — does a reconnecting client replay history, or just accept a fresh snapshot and lose predicted state?
- Where in your current implementation is an implicit assumption that packets arrive in order? Does it hold under loss?

---

## Phase 6 — Polish & Retrospective (Day 14)
**Learning goal:** Consolidate what you now understand that you didn't on Day 1.

**Do:**
- Write yourself a short retro: for each of prediction, reconciliation, interpolation, and tick sync — what surprised you, and what would you do differently starting over?
- Optional stretch, only if time allows: lag compensation for hit detection (e.g., "was I actually inside the blast radius from *my* point of view when I died?")

---

## Suggested (Not Prescribed) Tooling Notes
Keep these decisions cheap so they don't eat your two weeks — the game engine and transport are scaffolding, not the lesson:
- A minimal 2D setup (plain canvas/HTML5, or a lightweight framework you already know) is fine — don't spend budget on graphics.
- Whatever transport you pick, make sure you can artificially inject latency/loss for testing — that tooling pays for itself by Phase 2.

---

## What This Plan Deliberately Leaves Open
By design, it does not tell you: your reconciliation algorithm, your input buffer structure, your explosion-resolution ordering rule, your interpolation delay constant, or your resync protocol. Those are the actual exercise. If you get stuck on one of the "questions to answer yourself," that's the signal you've hit the real problem the phase exists to teach — sit with it before reaching for a reference implementation.
