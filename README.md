# Aetherpath

A dungeon adventure RPG.
You steer the story; the world materialises holographically on-screen.
Push through doors deeper into a procedurally connected vault, fight or flee what you find, and race to claim the Aether Core before the dark claims you.

> Working title. Game is likely to change. See [docs/PLAN.md](./docs/PLAN.md) for the full product and technical plan.

## The loop

- Every room is one look-around (or a blind step) away from revealing its doors.
- Every door leads deeper — a new procedurally generated chamber, one room graph node per push.
- What's behind it is a gamble: an empty passage, loot (sometimes healing), a trap, or something that's noticed you.
- Meet a monster and you choose: **fight** (risk a wound for a clear path and maybe loot) or **flee** (small guaranteed cost, stay put).
- HP hits 0 and the hologram goes dark — run over, try again.
- Reach depth 5 and the Aether Core is yours — a full, winnable, bounded run.

A status bar tracks HP, vault depth, and carried items live; a victory or defeat overlay closes out the run with a one-tap restart.

## Layout

```
Brand + tokens · HP / vault-depth / inventory status bar
────────────────────────────
Holographic world (live scene) · story feed
────────────────────────────
Player choices (2–4) — or a victory/defeat overlay once the run ends
```

## Monorepo

| Package | Role |
|---------|------|
| `apps/web` | Vite + React client, React Three Fiber hologram |
| `apps/api` | Hono API — adventure turns, wallet, ad/purchase stubs |
| `packages/shared` | Shared TypeScript contracts |

## Try on mobile

Static demo (client-side story engine, no API):  
**https://shifuguru.github.io/aetherpath/**

Deploys from `main` via GitHub Actions → GitHub Pages (`VITE_DEMO_MODE=true`).

Local full stack (API + web): `pnpm install && pnpm dev`

## Roadmap (short)

1. Real LLM structured turns  
2. Persist sessions + wallets  
3. Stripe + rewarded-ad verification  
4. Deeper RPG systems  

Details in [docs/PLAN.md](./docs/PLAN.md).
