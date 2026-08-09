# Aetherpath

A dungeon adventure RPG.
You steer the story; the world materialises holographically on-screen.
Create your own scrolling narrative, deal with choices, and uncover what lies at the foundations of the deep.

> Working title. Game is likely to change. See [docs/PLAN.md](./docs/PLAN.md) for the full product and technical plan.

## Layout

```
Brand + tokens · status ticker (“+1 item found!”)
────────────────────────────
Holographic world (live scene)
────────────────────────────
Player choices (2–4)
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
