import type { APIRoute } from "astro";
import { API_VERSION, stateRecords, sourceNote, json } from "../../../../src/lib/agent-api";

// Every state the site covers, with its pages, insurance regulator and referral line status.
export const GET: APIRoute = ({ site }) => {
  const states = stateRecords(site!.origin);
  return json({ version: API_VERSION, count: states.length, states, ...sourceNote });
};
