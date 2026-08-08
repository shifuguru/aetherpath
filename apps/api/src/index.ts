import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { economyRoutes } from "./routes/economy.js";
import { adventureRoutes } from "./routes/adventure.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "aetherpath-api" }));

app.route("/v1/adventure", adventureRoutes);
app.route("/v1/economy", economyRoutes);

const port = Number(process.env.PORT ?? 8787);

console.log(`Aetherpath API listening on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
