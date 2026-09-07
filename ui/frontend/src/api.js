const API = '/api';


export async function fetchSummary() {
  const r = await fetch(`${API}/summary`);
  return r.json();
}
export async function fetchUsers() {
  const r = await fetch(`${API}/users`);
  return r.json();
}
export async function fetchRelationships() {
  const r = await fetch(`${API}/relationships`);
  return r.json();
}
export async function fetchStatuses() {
  const r = await fetch(`${API}/statuses`);
  return r.json();
}
export async function fetchInteractions() {
  const r = await fetch(`${API}/interactions`);
  return r.json();
}
export async function fetchGraphMetrics() {
  const r = await fetch(`${API}/graph/metrics`);
  return r.json();
}
export async function fetchGraphNodes() {
  const r = await fetch(`${API}/graph/nodes`);
  return r.json();
}
export async function fetchGraphEdges(type) {
  const r = await fetch(`${API}/graph/edges?type=${type}`);
  return r.json();
}
export async function fetchInteractionCounts() {
  const r = await fetch(`${API}/graph/interaction-counts`);
  return r.json();
}
export async function fetchFeatures() {
  const r = await fetch(`${API}/features`);
  return r.json();
}
export async function fetchFeatureById(id) {
  const r = await fetch(`${API}/features/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  return r.json();
}
export async function fetchTrustWeights() {
  const r = await fetch(`${API}/trust/weights`);
  return r.json();
}
export async function fetchTrustScores() {
  const r = await fetch(`${API}/trust/scores`);
  return r.json();
}
export async function fetchTrustById(id) {
  const r = await fetch(`${API}/trust/scores/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  return r.json();
}
