# Aetherpath — Product & Technical Plan

Working title: **Aetherpath**  
Genre: AI-driven dungeon adventure RPG  
Core fantasy: You choose the story; the world materialises in a holographic format between your choices and the unfolding narrative.

---

## 1. Player fantasy (one sentence)

Step into a living dungeon that writes itself around your decisions, a holographic chamber rematerialising in the middle, and multiple paths waiting at your feet.

---

## 2. Experience layout (locked)

```
┌─────────────────────────────────────┐
│  Brand + token balance              │
│─────────────────────────────────────│
│  STORY FEED (scrolls from top)      │  ← narrative beats
│─────────────────────────────────────│
│                                     │
│     HOLOGRAPHIC WORLD (real-time)   │  ← scene from AI brief
│                                     │
│─────────────────────────────────────│
│  CHOICES (2–4)                      │  ← player agency
└─────────────────────────────────────┘
```

Rules for the first playable surface:

- One composition, not a dashboard.
- No cards in the hero/play loop.
- Hologram is the visual anchor (not a side image).
- Choices are the only interaction container at the bottom.

---

## 3. Core gameplay loop

1. Player enters with a free token grant.
2. AI (or skeleton engine) emits: hologram begins a faint isometric square then a holographic person drops down into that square. Player Creation;
3. Player chooses their character's appearance or presses random to create a randomly generated character. they choose their player's name. then they can press play at the bottom.
4. After that the Player is given a choice:
→ a) stay still and look around (generate 1 square tile semi-ring around player to gain additional visibility of the area around them, which generates 3-5 square tiles around them. 
→ b) move forward blindly uncovering a 1 square tile ring around them.

Optional later loops: combat checks, inventory puzzles, reputation, multi-room maps.

---

## 4. Monetization

| Lane | Mechanism | Notes |
|------|-----------|--------|
| Soft currency | Tokens | Spent per AI turn (configurable) |
| IAP | Token packs | Stripe (web) / store kits (mobile later) |
| Ads | Rewarded video | Grants a small token burst; never forced mid-beat |

Principles:

- Never interrupt mid-narration; gate only on the next turn.
- Ads are opt-in (“watch to continue”), not interstitial spam.
- Server validates purchases and ad receipts; client never trusts itself for balances.

Skeleton endpoints already stub this under `/v1/economy/*`.

---

## 5. System architecture

```
apps/web          React + Vite + R3F hologram client
apps/api          Hono API: adventure turns, wallet, ad/purchase stubs
packages/shared   Shared types (session, choices, holo brief, economy)
```

### Adventure turn pipeline (target)

1. Client posts `choiceId` (+ session id).
2. API checks wallet → deducts tokens atomically.
3. Story service builds prompt from: seed, player sheet, recent beats, choice.
4. Model returns structured JSON: `{ beat, choices[2..4], holo, playerDelta? }`.
5. API persists session, returns updated session.
6. Client appends beat (scroll), crossfades hologram, presents choices.

### Hologram pipeline

- AI emits a **scene brief** (locale, mood, props, palette, focal) — not raw meshes.
- Client maps brief → procedural / kit-bashed Three.js scene (wireframe “holo” look).
- Later: optional image/sprite plates or Gaussian assets if quality bar rises.

### AI provider strategy

- Start: one chat model with JSON schema / tool output.
- Add: content safety filter, anti-jailbreak system prompt, max context window trimmer.
- Cost control: summarize older beats; cache opening templates; cheaper model for choice generation if needed.

---

## 6. Milestone plan

### M0 — Skeleton (this repo)

- [ ] Offline story engine with branches
- [ ] Token wallet + ad/purchase stubs
- [ ] GitHub remote + CI

### M1 — True AI turns

- Wire `OPENAI_API_KEY` (or Anthropic) into `storyEngine`
- Structured output validation (Zod)
- Session persistence (SQLite → Postgres)
- Prompt pack for dungeon tone + choice count constraints

### M2 — Economy that can ship

- Stripe Checkout for packs
- Real rewarded ads (e.g. AdMob / ironSource) with signed SSV
- Abuse limits (rate, device, receipt replay)

### M3 — Depth

- Character creation (class, flaw, relic)
- Inventory & simple skill checks
- Seeded “rooms” graph so revisits feel coherent
- Share/export run transcript

### M4 — Platform

- PWA polish + mobile layout QA
- Optional Capacitor/React Native shell
- Analytics (funnel: start → turn 5 → paywall → convert)

---

## 7. Open product decisions

1. **Tone:** dark fantasy vs whimsical mythic? (Skeleton assumes dark-teal dungeon.)
2. **Input model:** choices-only at launch, or free-text prompts too (higher cost/moderation)?
3. **Death:** permadeath runs vs checkpoint rests?
4. **Multiplayer:** none for v1 (recommended).
5. **Brand name:** Aetherpath is a placeholder — confirm before store listing.

---

## 8. Suggested next implementation slice

1. Create GitHub repo and push this skeleton.
2. Add Zod schemas + real LLM structured turn.
3. Persist sessions/wallets in SQLite.
4. Replace ad stub with one provider’s rewarded + server callback.
5. Playtest the three-band layout on phone and desktop; tune hologram readability.
