import type { APIRoute } from "astro";
import { API_VERSION, guideRecords, sourceNote, json } from "../../../../src/lib/agent-api";

// The national guides, reference pages, and the guides every state section has.
export const GET: APIRoute = ({ site }) => json({ version: API_VERSION, ...guideRecords(site!.origin), ...sourceNote });
