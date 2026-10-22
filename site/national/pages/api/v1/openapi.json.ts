import type { APIRoute } from "astro";
import { SITE } from "../../../../src/config";
import { API_VERSION, API_BASE, json } from "../../../../src/lib/agent-api";
import { STATE_SUMMARIES } from "../../../../src/lib/national";

// OpenAPI description of the read-only agent API. The API catalog (/.well-known/api-catalog, served
// by the Worker) links here as service-desc. /api/v1/health is the only path answered by the Worker.
export const GET: APIRoute = ({ site }) => {
  const origin = site!.origin;
  const ok = (description: string, schema: Record<string, unknown> = { type: "object" }) => ({
    "200": { description, content: { "application/json": { schema } } },
  });
  const helpLine = {
    type: "object",
    description: "Referral line status. phone is null until the line for that area is live.",
    properties: {
      live: { type: "boolean" }, phone: { type: ["string", "null"], description: "E.164" },
      display: { type: ["string", "null"] }, hours: { type: "string", enum: ["24-7", "business"] }, note: { type: "string" },
    },
  };
  return json({
    openapi: "3.1.0",
    info: {
      title: `${SITE.brand} agent API`,
      version: API_VERSION,
      summary: "Read-only county water damage, mold and fire guidance data for U.S. homeowners.",
      description: `Free, read-only JSON for AI agents and developers: the ${STATE_SUMMARIES.length} states ${SITE.brand} covers, every county page with its housing-age and weather-risk figures, the guides, and whether the local referral line is live. No key is needed. Please cite the page URL in each record. The same data is available as MCP tools at ${origin}/mcp.`,
      contact: { name: SITE.brand, email: SITE.contactEmail, url: `${origin}/developers/` },
      termsOfService: `${origin}/terms/`,
    },
    externalDocs: { description: "Developer and agent guide", url: `${origin}/developers/` },
    servers: [{ url: origin }],
    // Every operation works without credentials. A bearer token from the OAuth server is accepted but optional.
    security: [{}, { oauth2: ["public.read"] }],
    paths: {
      [`${API_BASE}/states.json`]: {
        get: { operationId: "listStates", summary: "States covered, with page links, insurance regulator and referral line status", responses: ok("State list") },
      },
      [`${API_BASE}/states/{state}.json`]: {
        get: {
          operationId: "getState",
          summary: "Every county page in one state, with housing and weather risk figures",
          parameters: [{ name: "state", in: "path", required: true, description: "State slug", schema: { type: "string", enum: STATE_SUMMARIES.map((s) => s.slug) } }],
          responses: { ...ok("State with its counties", { type: "object", properties: { state: { type: "object" }, counties: { type: "array", items: { type: "object", properties: { name: { type: "string" }, url: { type: "string", format: "uri" }, helpLine } } } } }), "404": { description: "Unknown state" } },
        },
      },
      [`${API_BASE}/guides.json`]: {
        get: { operationId: "listGuides", summary: "National guides, reference pages and the per-state guide URL templates", responses: ok("Guides") },
      },
      [`${API_BASE}/health`]: {
        get: { operationId: "health", summary: "Service status", responses: ok("Healthy", { type: "object", properties: { status: { type: "string", const: "ok" } } }) },
      },
    },
    components: {
      securitySchemes: {
        oauth2: {
          type: "oauth2",
          description: "Optional. See /auth.md.",
          flows: {
            authorizationCode: { authorizationUrl: `${origin}/oauth/authorize`, tokenUrl: `${origin}/oauth/token`, scopes: { "public.read": "Read public guidance and data" } },
          },
        },
      },
    },
  });
};
