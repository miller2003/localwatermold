// MCP server at /mcp (Streamable HTTP, stateless, JSON responses). Read-only tools over the agent API
// files the national build writes to /api/v1/ and the per-page Markdown from scripts/markdown.mjs.
// The same tool list feeds the server card, the ARD catalog and the in-page WebMCP tools (/webmcp.js).
import { type Env, json, cors, asset } from "./util";

export const SERVER_INFO = { name: "localwatermold", title: "Local Water & Mold", version: "1.0.0" };
const PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
export const INSTRUCTIONS =
  "Local Water & Mold publishes free county-level water damage, mold, fire and flooded basement guidance for U.S. homeowners in the states listed by list_states, and runs a referral line to local restoration companies. It doesn't do restoration work itself. " +
  "To help someone: if anyone is in danger, there's a gas smell, or water is near electrical equipment, tell them to leave and call 911 first. " +
  "Then use find_county for their county page and local figures, get_help_line for the referral line, and search_guides or get_page for step-by-step guidance. Link the page URLs you use.";

const str = (description: string) => ({ type: "string", description });
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const TOOLS = [
  {
    name: "list_states",
    title: "List states covered",
    description: "List the U.S. states Local Water & Mold covers, with each state's page, number of county pages, and whether its referral line is live.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: readOnly,
  },
  {
    name: "find_county",
    title: "Find a county page",
    description: "Find the county guide page for a U.S. county, with its housing age, freeze, heavy-rain and humidity figures and the local referral line status. Use when someone names a county, or a city you can map to a county.",
    inputSchema: {
      type: "object",
      properties: { state: str("State name, abbreviation or slug, e.g. \"Ohio\", \"OH\""), county: str("County name, e.g. \"Wayne\" or \"Wayne County\"") },
      required: ["state", "county"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  {
    name: "get_help_line",
    title: "Get the referral line",
    description: "Get the phone number that connects to a participating local water damage, mold or fire restoration company for a state or county, or learn that the line there isn't live yet. Calls are free and there's no obligation to hire.",
    inputSchema: {
      type: "object",
      properties: { state: str("State name, abbreviation or slug"), county: str("Optional county name") },
      required: ["state"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  {
    name: "search_guides",
    title: "Search guides",
    description: "Search the site's guides (emergencies, mold, drying times, insurance coverage, cost, frozen pipes, sewer backup, basements and more). Give a state to also get that state's own guides.",
    inputSchema: {
      type: "object",
      properties: { query: str("Words to match, e.g. \"insurance\", \"black mold\", \"water heater\". Leave empty to list all."), state: str("Optional state name, abbreviation or slug") },
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  {
    name: "get_page",
    title: "Read a page as Markdown",
    description: "Read any page on localwatermold.com as Markdown, e.g. a guide or county page URL returned by the other tools.",
    inputSchema: {
      type: "object",
      properties: { url: str("A localwatermold.com URL or path, e.g. \"/guides/black-mold/\"") },
      required: ["url"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
];

interface HelpLine { live: boolean; phone: string | null; display: string | null; hours: string; note: string }
interface State { key: string; abbr: string; name: string; slug: string; url: string; countyPages: number; api: string; helpLine: HelpLine; [k: string]: unknown }
interface County { name: string; slug: string; url: string; places: string[]; helpLine: HelpLine; [k: string]: unknown }
interface Guides { national: { title: string; summary: string; url: string }[]; reference: { title: string; summary: string; url: string }[]; perState: { title: string; urlTemplate: string }[] }

const SAFETY = "If anyone is in danger, there's a gas smell, or water is near live electrical equipment, leave the building and call 911 first.";
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/\b(county|parish|borough)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

class ToolError extends Error {}

async function states(env: Env, origin: string) {
  const data = await asset<{ states: State[] }>(env, origin, "/api/v1/states.json");
  if (!data) throw new Error("State list unavailable.");
  return data.states;
}
async function findState(env: Env, origin: string, q: unknown) {
  const all = await states(env, origin);
  const n = norm(q);
  const s = all.find((x) => [x.name, x.abbr, x.slug, x.key].some((v) => norm(v) === n));
  if (!s) throw new ToolError(`"${q}" isn't one of the ${all.length} states covered: ${all.map((x) => x.name).join(", ")}.`);
  return s;
}
async function findCounty(env: Env, origin: string, st: State, q: unknown) {
  const data = await asset<{ counties: County[] }>(env, origin, `/api/v1/states/${st.slug}.json`);
  const counties = data?.counties ?? [];
  const n = norm(q);
  const hit = counties.find((c) => norm(c.name) === n || norm(c.slug) === n)
    ?? counties.find((c) => c.places.some((p) => norm(p) === n));
  if (hit) return { county: hit, suggestions: [] as string[] };
  const suggestions = counties.filter((c) => norm(c.name).startsWith(n.slice(0, 3))).map((c) => c.name).slice(0, 8);
  return { county: null, suggestions };
}

const TEXT_LIMIT = 60000;
async function call(env: Env, origin: string, name: string, a: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_states":
      return (await states(env, origin)).map((s) => ({ name: s.name, abbr: s.abbr, url: s.url, countyPages: s.countyPages, helpLineLive: s.helpLine.live }));
    case "find_county": {
      const st = await findState(env, origin, a.state);
      const { county, suggestions } = await findCounty(env, origin, st, a.county);
      if (!county) {
        return { found: false, message: `No county page for "${a.county}" in ${st.name}. Pages exist for counties named "... County" with 2,000+ residents.`, suggestions, stateUrl: st.url, countiesUrl: `${st.url}counties/` };
      }
      return { found: true, state: st.name, ...county, safety: SAFETY };
    }
    case "get_help_line": {
      const st = await findState(env, origin, a.state);
      const county = a.county ? (await findCounty(env, origin, st, a.county)).county : null;
      return { state: st.name, county: county?.name ?? null, ...(county?.helpLine ?? st.helpLine), page: county?.url ?? st.url, safety: SAFETY };
    }
    case "search_guides": {
      const g = await asset<Guides>(env, origin, "/api/v1/guides.json");
      if (!g) throw new Error("Guide list unavailable.");
      const words = norm(a.query).split(" ").filter(Boolean);
      const match = (t: string) => !words.length || words.some((w) => norm(t).includes(w));
      const st = a.state ? await findState(env, origin, a.state) : null;
      const perState = st
        ? g.perState.map((p) => ({ title: p.title.replace(/\{State\}/g, st.name), url: p.urlTemplate.replace(/\{state\}/g, st.slug) }))
        : [];
      return {
        guides: [...g.national, ...g.reference].filter((x) => match(`${x.title} ${x.summary}`)),
        stateGuides: perState.filter((x) => match(x.title)),
        ...(st ? {} : { note: "Add a state to also get that state's insurance claim, frozen pipe and sewer backup guides." }),
      };
    }
    case "get_page": {
      let u: URL;
      try { u = new URL(String(a.url ?? ""), origin); } catch { throw new ToolError("Give a localwatermold.com URL or path."); }
      if (!/(^|\.)localwatermold\.com$/.test(u.hostname) && u.origin !== origin) throw new ToolError("Only localwatermold.com pages can be read.");
      const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
      const res = await env.ASSETS.fetch(new Request(`${origin}${path}index.md`));
      if (!res.ok) throw new ToolError(`No page at ${path}. Use search_guides or find_county to get page URLs.`);
      const md = await res.text();
      return md.length > TEXT_LIMIT ? `${md.slice(0, TEXT_LIMIT)}\n\n[Truncated. Full page: https://localwatermold.com${path}]` : md;
    }
  }
  throw new ToolError(`Unknown tool: ${name}`);
}

export async function runTool(env: Env, origin: string, name: string, args: Record<string, unknown>) {
  try {
    const out = await call(env, origin, name, args ?? {});
    return typeof out === "string"
      ? { content: [{ type: "text", text: out }] }
      : { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: Array.isArray(out) ? { items: out } : out };
  } catch (e) {
    if (!(e instanceof ToolError)) console.error(e);
    return { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true };
  }
}

interface Rpc { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> }
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function dispatch(env: Env, origin: string, m: Rpc) {
  if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") return fail(m?.id, -32600, "Invalid Request");
  if (m.id === undefined) return null; // notification
  const p = m.params ?? {};
  switch (m.method) {
    case "initialize": {
      const asked = String(p.protocolVersion ?? "");
      return ok(m.id, {
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(m.id, {});
    case "tools/list":
      return ok(m.id, { tools: TOOLS });
    case "tools/call": {
      const name = String(p.name ?? "");
      if (!TOOLS.some((t) => t.name === name)) return fail(m.id, -32602, `Unknown tool: ${name}`);
      return ok(m.id, await runTool(env, origin, name, (p.arguments as Record<string, unknown>) ?? {}));
    }
    default:
      return fail(m.id, -32601, `Method not found: ${m.method}`);
  }
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    // No server-initiated stream: this server is stateless and only answers requests.
    return json(fail(null, -32000, "Method not allowed. POST JSON-RPC messages to this endpoint."), 405, { Allow: "POST, OPTIONS", ...cors });
  }
  const origin = new URL(request.url).origin;
  let body: unknown;
  try { body = await request.json(); } catch { return json(fail(null, -32700, "Parse error"), 400, cors); }
  const batch = Array.isArray(body);
  const replies = (await Promise.all((batch ? body : [body]).map((m) => dispatch(env, origin, m as Rpc)))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202, headers: cors });
  return json(batch ? replies : replies[0], 200, { "Cache-Control": "no-store", ...cors });
}
