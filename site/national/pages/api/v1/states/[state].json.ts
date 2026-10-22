import type { APIRoute } from "astro";
import { STATE_SUMMARIES } from "../../../../../src/lib/national";
import { API_VERSION, stateRecords, countyRecords, sourceNote, json } from "../../../../../src/lib/agent-api";

// One state's county pages with each county's housing and weather figures and referral line status.
export function getStaticPaths() {
  return STATE_SUMMARIES.map((s) => ({ params: { state: s.slug }, props: { key: s.key } }));
}

export const GET: APIRoute = ({ site, params, props }) => {
  const origin = site!.origin;
  const state = stateRecords(origin).find((s) => s.slug === params.state)!;
  const counties = countyRecords(origin, props.key as string, state.slug);
  return json({ version: API_VERSION, state, count: counties.length, counties, ...sourceNote });
};
