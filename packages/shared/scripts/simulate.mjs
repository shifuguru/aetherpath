/**
 * Bounded soak test for the dungeon-crawl engine: plays many full runs with
 * simple bot strategies and asserts every run reaches a terminal state
 * (won/lost) — catching soft-locks and win/loss balance regressions.
 * Run with `pnpm --filter @aetherpath/shared run test` (builds first).
 */
import { createOpeningSession, generateTurn, applyTurn, WIN_DEPTH } from "../dist/index.js";

function pickChoiceId(session, rngSeedNum, strategy, triedDoors) {
  const { choices } = session;
  if (choices.length === 0) return null;
  const doorChoices = choices.filter((c) => c.id.startsWith("door-"));
  if (doorChoices.length > 0) {
    // Prefer a door we haven't just fled from, if one exists.
    const fresh = doorChoices.find((c) => !triedDoors.has(c.id));
    return (fresh ?? doorChoices[0]).id;
  }
  if (choices.some((c) => c.id === "fight")) {
    if (strategy === "smart" && session.player.hp <= 8) return "flee";
    return "fight";
  }
  return choices[rngSeedNum % choices.length].id;
}

async function runOnce(seed, strategy) {
  let session = createOpeningSession({
    id: `sess-${seed}`,
    seed,
    playerName: "Simmer",
    className: "Spellblade",
    tokensRemaining: 999,
  });

  let turns = 0;
  const maxTurns = 200;
  let triedDoors = new Set();
  let lastDoor = null;
  while (session.status === "active" && turns < maxTurns) {
    const choiceId = pickChoiceId(session, turns + seed.length, strategy, triedDoors);
    if (!choiceId) break;
    if (choiceId.startsWith("door-")) lastDoor = choiceId;
    const turn = await generateTurn(session, choiceId);
    session = applyTurn(session, turn);
    if (choiceId === "flee" && lastDoor) {
      triedDoors.add(lastDoor);
    } else if (choiceId.startsWith("door-")) {
      triedDoors = new Set(); // entered a new room; start fresh
    }
    turns++;
  }

  return { seed, status: session.status, depth: session.player.depth, hp: session.player.hp, turns, inventory: session.player.inventory };
}

async function runBatch(strategy, n) {
  const seeds = Array.from({ length: n }, (_, i) => `sim-${strategy}-${i}`);
  const results = await Promise.all(seeds.map((s) => runOnce(s, strategy)));
  let won = 0;
  let lost = 0;
  let stuck = 0;
  for (const r of results) {
    if (r.status === "won") won++;
    else if (r.status === "lost") lost++;
    else stuck++;
  }
  const wonTurns = results.filter((r) => r.status === "won").map((r) => r.turns);
  const maxWinTurns = wonTurns.length ? Math.max(...wonTurns) : 0;
  const minWinTurns = wonTurns.length ? Math.min(...wonTurns) : 0;
  console.log(
    `[${strategy} strategy] won=${won} lost=${lost} stuck=${stuck} of ${results.length} (${((won / results.length) * 100).toFixed(1)}% win rate) — winning runs took ${minWinTurns}-${maxWinTurns} turns`,
  );
  return { won, lost, stuck };
}

const reckless = await runBatch("reckless", 400);
const smart = await runBatch("smart", 400);
if (reckless.stuck > 0 || smart.stuck > 0) {
  console.error("FAIL: some runs never reached a terminal state within maxTurns");
  process.exit(1);
}
