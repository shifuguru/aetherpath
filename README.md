# Aetherpath

AI dungeon adventure RPG. You steer the story; the world rematerializes as a hologram between scrolling narrative (top) and 2–4 choices (bottom). Continue by spending tokens — buy packs or watch a rewarded ad.

> Working title. See [docs/PLAN.md](./docs/PLAN.md) for the full product and technical plan.

## Layout

```
Story feed (scrolls down from the top)
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

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- Web: http://localhost:5173  
- API: http://localhost:8787/health  

The story engine runs offline with authored branches so you can play the loop without an AI key. Token packs and ads are stubbed for local demo (`stub_*` ad receipts).

## Scripts

- `pnpm dev` — API + web in parallel  
- `pnpm --filter @aetherpath/web dev`  
- `pnpm --filter @aetherpath/api dev`  
- `pnpm build`  

## Roadmap (short)

1. Real LLM structured turns  
2. Persist sessions + wallets  
3. Stripe + rewarded-ad verification  
4. Deeper RPG systems  

Details in [docs/PLAN.md](./docs/PLAN.md).
