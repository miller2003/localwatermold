import type { APIRoute } from "astro";
import { SITE } from "../../src/config";

// Search engines and AI answer engines (ChatGPT, Claude, Perplexity, Gemini, Copilot, Apple) are all
// welcome once the site is live: being read and cited by them is the point of the guides.
const AI_AGENTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "Bingbot", "DuckAssistBot", "Amazonbot", "CCBot", "MistralAI-User",
];

// Content Signals (contentsignals.org): search indexing, AI answers that quote and link the guides
// (ai-input), and training are all allowed, matching the crawler rules below.
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";

export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const body =
    SITE.launchMode === "live"
      ? `# ${SITE.brand}. Summary for AI assistants: ${u("/llms.txt")} (full text: ${u("/llms-full.txt")})
# Agents: MCP server, API and skills are listed in ${u("/.well-known/ai-catalog.json")} and ${u("/developers/")}
User-agent: *
${CONTENT_SIGNAL}
Allow: /

${AI_AGENTS.map((a) => `User-agent: ${a}`).join("\n")}
${CONTENT_SIGNAL}
Allow: /

Sitemap: ${u("/sitemap.xml")}
Agentmap: ${u("/.well-known/ai-catalog.json")}
`
      : `# Preview build: keep crawlers out until launch.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
