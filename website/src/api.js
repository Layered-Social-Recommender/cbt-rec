/**
 * API client for CBT-Rec backend (Node.js server on port 3001).
 * Mirrors the api.js from ui/frontend, adapted for the project website.
 */

const API_BASE = 'http://localhost:3001/api';

async function safeFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// Layer 1 — Data Layer
export const fetchSummary = () => safeFetch(`${API_BASE}/summary`);
export const fetchUsers = () => safeFetch(`${API_BASE}/users`);
export const fetchRelationships = () => safeFetch(`${API_BASE}/relationships`);
export const fetchStatuses = () => safeFetch(`${API_BASE}/statuses`);
export const fetchInteractions = () => safeFetch(`${API_BASE}/interactions`);

// Layer 2 — Social Graph
export const fetchGraphMetrics = () => safeFetch(`${API_BASE}/graph/metrics`);
export const fetchGraphNodes = () => safeFetch(`${API_BASE}/graph/nodes`);
export const fetchGraphEdges = (type) => safeFetch(`${API_BASE}/graph/edges?type=${type}`);
export const fetchInteractionCounts = () => safeFetch(`${API_BASE}/graph/interaction-counts`);

// Layer 3 — Features
export const fetchFeatures = () => safeFetch(`${API_BASE}/features`);
export const fetchFeatureById = (id) => safeFetch(`${API_BASE}/features/${encodeURIComponent(id)}`);

// Layer 4 — Trust / MCDM
export const fetchTrustWeights = () => safeFetch(`${API_BASE}/trust/weights`);
export const fetchTrustScores = () => safeFetch(`${API_BASE}/trust/scores`);
export const fetchTrustById = (id) => safeFetch(`${API_BASE}/trust/scores/${encodeURIComponent(id)}`);

// Layer 5+6 — Recommendations
export const fetchRecommendationTargets = () => safeFetch(`${API_BASE}/recommendations/targets`);
export const fetchRecommendations = (id, scoringMode = 'heuristic') => {
  const query = scoringMode ? `?scoring_mode=${encodeURIComponent(scoringMode)}` : '';
  return safeFetch(`${API_BASE}/recommendations/${encodeURIComponent(id)}${query}`);
};
export const fetchCustomRecommendations = (body) =>
  safeFetch(`${API_BASE}/recommendations/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
