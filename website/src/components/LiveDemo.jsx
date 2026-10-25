import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchSummary, fetchUsers, fetchRelationships, fetchStatuses, fetchInteractions,
  fetchGraphNodes, fetchGraphEdges, fetchGraphMetrics, fetchInteractionCounts,
  fetchFeatures, fetchFeatureById,
  fetchTrustWeights, fetchTrustScores, fetchTrustById,
  fetchRecommendationTargets, fetchRecommendations, fetchCustomRecommendations,
} from '../api';

/* ─── Shared Helpers ─── */
const gold = '#d4a843';
const goldDim = 'rgba(212, 168, 67, 0.25)';
const goldGlow = 'rgba(212, 168, 67, 0.08)';
const bgCard = 'rgba(20, 20, 23, 0.92)';
const borderCard = 'rgba(255,255,255,0.08)';
const borderGold = 'rgba(212, 168, 67, 0.35)';
const textPrimary = '#ffffff';
const textSecondary = '#a1a1aa';
const textMuted = '#71717a';

function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}
function formatSnapshotDate(ts) {
  if (!ts) return 'Date unavailable';
  let normalised = ts.replace(/\+00:00Z$/, 'Z').replace(/\+00:00$/, 'Z');
  const d = new Date(normalised);
  if (isNaN(d.getTime())) return 'Date unavailable';
  return d.toLocaleString();
}

/* ─── Stat Card ─── */
function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: bgCard,
      border: `1px solid ${accent ? borderGold : borderCard}`,
      borderRadius: '10px',
      padding: '1rem 1.25rem',
      textAlign: 'center',
      minWidth: '120px',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: accent ? gold : textPrimary }}>{value}</div>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: textMuted, letterSpacing: '0.04em', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

/* ─── Badge ─── */
function Badge({ children, variant = 'default' }) {
  const styles = {
    default: { background: 'rgba(255,255,255,0.06)', color: textSecondary, border: `1px solid ${borderCard}` },
    gold: { background: goldGlow, color: gold, border: `1px solid ${goldDim}` },
    success: { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' },
    warning: { background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' },
    muted: { background: 'rgba(255,255,255,0.04)', color: textMuted, border: `1px solid ${borderCard}` },
  };
  return (
    <span style={{
      ...styles[variant],
      fontSize: '0.7rem',
      fontWeight: 600,
      padding: '0.15rem 0.55rem',
      borderRadius: '4px',
      display: 'inline-block',
    }}>{children}</span>
  );
}

/* ─── Sub-Tab Buttons ─── */
function SubTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '6px',
            border: active === t.id ? `1px solid ${gold}` : `1px solid ${borderCard}`,
            background: active === t.id ? goldGlow : 'rgba(20,20,23,0.7)',
            color: active === t.id ? gold : textSecondary,
            fontSize: '0.82rem',
            fontWeight: active === t.id ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {t.icon && <span style={{ marginRight: '0.35rem' }}>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Connection Check ─── */
function BackendNotice() {
  return (
    <div style={{
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: '8px',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <span style={{ fontSize: '1.15rem' }}>⚡</span>
      <div>
        <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: '0.15rem', fontSize: '0.85rem' }}>Backend Required</div>
        <div style={{ fontSize: '0.8rem', color: textSecondary }}>
          This live dashboard requires the CBT-Rec Node.js API server on <code style={{ color: textPrimary }}>localhost:3001</code>. Start it with: <code style={{ color: textPrimary }}>cd ui && node server.js</code>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 1 — PIPELINE OVERVIEW / DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function PipelineOverview() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const layers = [
    { layer: 1, name: 'Data Collection Layer', desc: 'Mastodon API crawling, account/follow/interaction ingestion', status: 'Implemented' },
    { layer: 2, name: 'Social Graph Layer', desc: 'Follow & interaction graph construction, PageRank, Louvain community detection', status: 'Implemented' },
    { layer: 3, name: 'Feature & Context Layer', desc: 'Six MCDM criteria extraction, behaviour scoring, context profiling', status: 'Implemented' },
    { layer: 4, name: 'Trust / MCDM Layer', desc: 'Multi-criteria decision making via SAW — six-criteria trustworthiness estimation', status: 'Implemented' },
    { layer: 5, name: 'Recommendation Engine', desc: 'Heuristic baseline + Directed LightGCN hybrid scoring with MMR diversity', status: 'Implemented' },
    { layer: 6, name: 'Explainability Layer', desc: 'Human-readable evidence-based explanation generation for each recommendation', status: 'Implemented' },
  ];

  return (
    <div>
      {error && <BackendNotice />}
      {!error && loading && <div style={{ color: textMuted, textAlign: 'center', padding: '2rem' }}>Loading pipeline statistics...</div>}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          <StatCard label="Observed Accounts" value={summary.users} accent />
          <StatCard label="Complete Accounts" value={summary.completeUsers} />
          <StatCard label="Stub Accounts" value={summary.stubUsers} />
          <StatCard label="Follow Relationships" value={summary.relationships} />
          <StatCard label="Collected Statuses" value={summary.statuses} />
          <StatCard label="Interaction Records" value={summary.interactions} />
        </div>
      )}

      <h3 style={{ color: textPrimary, fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>CBT-Rec Layered Pipeline</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {layers.map((l, i) => (
          <div key={l.layer}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              background: bgCard,
              border: `1px solid ${borderCard}`,
              borderRadius: '8px',
            }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: gold,
                background: goldGlow,
                border: `1px solid ${goldDim}`,
                borderRadius: '4px',
                padding: '0.2rem 0.55rem',
                fontFamily: 'monospace',
              }}>L{l.layer}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: textPrimary, fontSize: '0.95rem' }}>{l.name}</div>
                <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: '0.15rem' }}>{l.desc}</div>
              </div>
              <Badge variant={l.status === 'Implemented' ? 'success' : 'muted'}>{l.status}</Badge>
            </div>
            {i < layers.length - 1 && (
              <div style={{ paddingLeft: '1.6rem', color: gold, fontSize: '1rem', lineHeight: '1.8', opacity: 0.5 }}>↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 2 — SOCIAL GRAPH
   ═══════════════════════════════════════════════════════════ */
function SocialGraphTab() {
  const [nodes, setNodes] = useState([]);
  const [followEdges, setFollowEdges] = useState([]);
  const [intEdges, setIntEdges] = useState([]);
  const [intCounts, setIntCounts] = useState({ reply: 0, mention: 0, reblog: 0 });
  const [metrics, setMetrics] = useState(null);
  const [graphType, setGraphType] = useState('follow');
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [communityFilter, setCommunityFilter] = useState('all');
  const [showStubs, setShowStubs] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const graphRef = useRef();
  const [ForceGraph, setForceGraph] = useState(null);

  useEffect(() => {
    import('react-force-graph-2d').then(mod => setForceGraph(() => mod.default));
  }, []);

  useEffect(() => {
    Promise.all([
      fetchGraphNodes(), fetchGraphEdges('follow'), fetchGraphEdges('interaction'),
      fetchGraphMetrics(), fetchInteractionCounts(),
    ]).then(([n, fe, ie, m, ic]) => {
      setNodes(n); setFollowEdges(fe); setIntEdges(ie); setMetrics(m); setIntCounts(ic);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const PALETTE = ['#d4a843','#34d399','#60a5fa','#f87171','#a78bfa','#22d3ee','#fb7185','#fb923c','#a3e635','#818cf8'];
  const communityColor = (cid) => cid == null ? '#52525b' : PALETTE[cid % PALETTE.length];

  const communities = [...new Set(nodes.map(n => n.community))].filter(c => c != null).sort((a, b) => a - b);
  const visibleNodes = nodes.filter(n => {
    if (!showStubs && n.is_stub) return false;
    if (communityFilter !== 'all' && n.community !== Number(communityFilter)) return false;
    if (search && !n.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  let edges = graphType === 'follow' ? followEdges : graphType === 'interaction' ? intEdges : [...followEdges, ...intEdges];
  const visibleEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
  const graphData = { nodes: visibleNodes.map(n => ({ ...n })), links: visibleEdges.map(e => ({ source: e.source, target: e.target, label: e.label })) };

  const replyCount = intCounts.reply ?? 0;
  const mentionCount = intCounts.mention ?? 0;
  const reblogCount = intCounts.reblog ?? 0;
  const uniquePairs = new Set(intEdges.map(e => `${e.source}→${e.target}`)).size;

  const edgeColor = (link) => {
    if (link.label === 'follows') return 'rgba(212, 168, 67, 0.3)';
    if (link.label === 'reply') return 'rgba(96, 165, 250, 0.6)';
    if (link.label === 'mention') return 'rgba(167, 139, 250, 0.6)';
    if (link.label === 'reblog') return 'rgba(52, 211, 153, 0.6)';
    return 'rgba(161, 161, 170, 0.3)';
  };

  if (error) return <BackendNotice />;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <StatCard label="Nodes" value={loading ? '…' : nodes.length} accent />
        <StatCard label="Follow Edges" value={loading ? '…' : followEdges.length} />
        <StatCard label="Interaction Pairs" value={loading ? '…' : uniquePairs} />
        <StatCard label="Replies" value={loading ? '…' : replyCount} />
        <StatCard label="Mentions" value={loading ? '…' : mentionCount} />
        <StatCard label="Reblogs" value={loading ? '…' : reblogCount} />
        <StatCard label="Communities" value={loading ? '…' : (metrics ? metrics.communities : '…')} accent />
      </div>

      {/* Graph Controls */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center',
        background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '8px', padding: '0.85rem 1rem',
      }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[['follow', 'Follow'], ['interaction', 'Interaction'], ['master', 'Master']].map(([v, l]) => (
            <button key={v} onClick={() => setGraphType(v)} style={{
              padding: '0.4rem 0.85rem', borderRadius: '5px', fontSize: '0.8rem', fontWeight: graphType === v ? 700 : 400,
              border: graphType === v ? `1px solid ${gold}` : `1px solid ${borderCard}`,
              background: graphType === v ? goldGlow : 'transparent',
              color: graphType === v ? gold : textSecondary,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>{l}</button>
          ))}
        </div>
        <input
          placeholder="Search node..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem', border: `1px solid ${borderCard}`, borderRadius: '5px',
            fontSize: '0.82rem', background: 'rgba(0,0,0,0.3)', color: textPrimary, flex: '1 1 160px',
          }}
        />
        <select value={communityFilter} onChange={e => setCommunityFilter(e.target.value)} style={{
          padding: '0.4rem 0.75rem', border: `1px solid ${borderCard}`, borderRadius: '5px',
          fontSize: '0.82rem', background: 'rgba(0,0,0,0.3)', color: textPrimary,
        }}>
          <option value="all">All Communities</option>
          {communities.slice(0, 30).map(c => <option key={c} value={c}>Community {c}</option>)}
        </select>
        <label style={{ fontSize: '0.8rem', color: textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <input type="checkbox" checked={showStubs} onChange={e => setShowStubs(e.target.checked)} /> Stubs
        </label>
      </div>

      {/* Graph + Node Details */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{
          flex: 1, border: `1px solid ${borderCard}`, borderRadius: '10px', overflow: 'hidden',
          background: '#0a0a0c', minHeight: 500,
        }}>
          {loading || !ForceGraph ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500, color: textMuted }}>Loading graph...</div>
          ) : (
            <ForceGraph
              ref={graphRef}
              graphData={graphData}
              nodeId="id"
              nodeLabel={n => `${n.id}\nCommunity: ${n.community ?? 'N/A'}\nPageRank: ${n.pagerank?.toFixed(4) ?? 'N/A'}`}
              nodeColor={n => communityColor(n.community)}
              nodeRelSize={4}
              nodeVal={n => Math.max(2, (n.inDegree || 0) * 0.5)}
              linkColor={edgeColor}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkWidth={1}
              onNodeClick={n => setSelectedNode(n)}
              width={700}
              height={500}
              backgroundColor="#0a0a0c"
            />
          )}
        </div>

        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={{
            background: bgCard, border: `1px solid ${selectedNode ? borderGold : borderCard}`,
            borderRadius: '10px', padding: '1.25rem',
          }}>
            <h4 style={{ color: textPrimary, fontSize: '0.95rem', marginBottom: '0.75rem', borderBottom: `1px solid ${borderCard}`, paddingBottom: '0.5rem' }}>
              {selectedNode ? 'Node Details' : 'Click a Node'}
            </h4>
            {selectedNode ? (
              <div style={{ fontSize: '0.82rem' }}>
                {[
                  ['Account', selectedNode.id],
                  ['Community', selectedNode.community ?? '—'],
                  ['In-degree', selectedNode.inDegree ?? '—'],
                  ['Out-degree', selectedNode.outDegree ?? '—'],
                  ['PageRank', selectedNode.pagerank?.toFixed(6) ?? '—'],
                  ['Clustering', selectedNode.clustering?.toFixed(6) ?? '—'],
                  ['Status', selectedNode.is_stub ? 'Stub' : 'Complete'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <span style={{ color: textMuted }}>{k}</span>
                    <span style={{ color: textPrimary, fontFamily: 'monospace', fontSize: '0.78rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p style={{ color: textMuted, fontSize: '0.82rem' }}>Click any node in the graph to inspect its metrics.</p>
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: textSecondary, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Edge Legend</div>
                  {[['Follow', gold], ['Reply', '#60a5fa'], ['Mention', '#a78bfa'], ['Reblog', '#34d399']].map(([l, c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '0.8rem', color: textSecondary }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 3 — DATA EXPLORER
   ═══════════════════════════════════════════════════════════ */
function DataExplorerTab() {
  const [users, setUsers] = useState([]);
  const [rels, setRels] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [ints, setInts] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchRelationships(), fetchStatuses(), fetchInteractions()])
      .then(([u, r, s, i]) => { setUsers(u); setRels(r); setStatuses(s); setInts(i); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <BackendNotice />;

  const tabs = [
    { id: 'users', label: `Users (${users.length})` },
    { id: 'rels', label: `Relationships (${rels.length})` },
    { id: 'statuses', label: `Statuses (${statuses.length})` },
    { id: 'ints', label: `Interactions (${ints.length})` },
  ];

  let data = [];
  let cols = [];
  if (tab === 'users') {
    data = users.filter(u => u.canonical_acct?.toLowerCase().includes(search.toLowerCase()));
    cols = ['#', 'Account', 'Followers', 'Following', 'Statuses', 'Bot', 'Stub'];
  } else if (tab === 'rels') {
    data = rels;
    cols = ['source_canonical', 'target_canonical', 'type'];
  } else if (tab === 'statuses') {
    data = statuses;
    cols = ['account_canonical', 'status_id', 'created_at', 'language', 'is_reblog'];
  } else {
    data = ints;
    cols = ['source_canonical', 'target_canonical', 'type', 'timestamp'];
  }

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, data.length);
  const displayed = data.slice(startIdx, endIdx);

  const handleTabChange = (id) => { setTab(id); setPage(1); setSearch(''); };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <StatCard label="Accounts" value={loading ? '…' : users.length} accent />
        <StatCard label="Complete" value={loading ? '…' : users.filter(u => !u.is_stub).length} />
        <StatCard label="Stub" value={loading ? '…' : users.filter(u => u.is_stub).length} />
        <StatCard label="Relationships" value={loading ? '…' : rels.length} />
        <StatCard label="Statuses" value={loading ? '…' : statuses.length} />
        <StatCard label="Interactions" value={loading ? '…' : ints.length} />
      </div>

      <SubTabs tabs={tabs.map(t => ({ id: t.id, label: t.label }))} active={tab} onChange={handleTabChange} />

      {tab === 'users' && (
        <input
          placeholder="Search by account…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            width: '100%', padding: '0.55rem 0.85rem', marginBottom: '1rem',
            border: `1px solid ${borderCard}`, borderRadius: '6px',
            background: 'rgba(0,0,0,0.3)', color: textPrimary, fontSize: '0.85rem',
          }}
        />
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
        <span style={{ color: textMuted }}>Showing {data.length === 0 ? 0 : startIdx + 1}–{endIdx} of {data.length}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{
            padding: '0.3rem 0.65rem', border: `1px solid ${borderCard}`, borderRadius: '4px',
            background: 'transparent', color: safePage === 1 ? textMuted : textSecondary,
            cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
          }}>← Prev</button>
          <span style={{ color: textSecondary }}>Page {safePage} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{
            padding: '0.3rem 0.65rem', border: `1px solid ${borderCard}`, borderRadius: '4px',
            background: 'transparent', color: safePage === totalPages ? textMuted : textSecondary,
            cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
          }}>Next →</button>
        </div>
      </div>

      {loading ? <div style={{ color: textMuted, padding: '2rem', textAlign: 'center' }}>Loading data...</div> : (
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${borderCard}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(212,168,67,0.06)' }}>
                {(tab === 'users' ? cols : cols).map(c => (
                  <th key={c} style={{ padding: '0.65rem 0.85rem', textAlign: 'left', color: gold, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: `1px solid ${borderCard}` }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {tab === 'users' ? (
                    <>
                      <td style={{ padding: '0.55rem 0.85rem', color: textMuted, fontSize: '0.75rem' }}>{startIdx + i + 1}</td>
                      <td style={{ padding: '0.55rem 0.85rem', fontFamily: 'monospace', fontSize: '0.78rem', color: textPrimary }}>{row.canonical_acct}</td>
                      <td style={{ padding: '0.55rem 0.85rem', color: textSecondary }}>{fmt(row.followers_count)}</td>
                      <td style={{ padding: '0.55rem 0.85rem', color: textSecondary }}>{fmt(row.following_count)}</td>
                      <td style={{ padding: '0.55rem 0.85rem', color: textSecondary }}>{fmt(row.statuses_count)}</td>
                      <td style={{ padding: '0.55rem 0.85rem' }}><Badge variant={row.bot ? 'warning' : 'muted'}>{row.bot ? 'Yes' : 'No'}</Badge></td>
                      <td style={{ padding: '0.55rem 0.85rem' }}><Badge variant={row.is_stub ? 'warning' : 'success'}>{row.is_stub ? 'Stub' : 'Complete'}</Badge></td>
                    </>
                  ) : (
                    cols.map(c => (
                      <td key={c} style={{ padding: '0.55rem 0.85rem', fontFamily: 'monospace', fontSize: '0.78rem', color: textSecondary }}>{fmt(row[c])}</td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 4 — FEATURE PROFILES
   ═══════════════════════════════════════════════════════════ */
function FeatureProfilesTab() {
  const [allFeatures, setAllFeatures] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [feat, setFeat] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeatures().then(setAllFeatures).catch(e => setError(e.message));
  }, []);

  if (error) return <BackendNotice />;

  const CRITERIA = ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation'];
  const LABELS = { activity: 'Activity', popularity: 'Popularity', influence: 'Influence', community_participation: 'Community', reciprocity: 'Reciprocity', reputation: 'Reputation' };

  const filtered = allFeatures.filter(u => u.canonical_acct?.toLowerCase().includes(search.toLowerCase()));

  function selectUser(u) {
    setSelected(u.canonical_acct);
    setLoadingDetail(true);
    fetchFeatureById(u.canonical_acct).then(data => { setFeat(data); setLoadingDetail(false); });
  }

  return (
    <div style={{ display: 'flex', gap: '1.25rem' }}>
      {/* User List */}
      <div style={{ width: 250, flexShrink: 0 }}>
        <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', padding: '1rem' }}>
          <h4 style={{ color: textPrimary, fontSize: '0.9rem', marginBottom: '0.65rem' }}>Select User</h4>
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.4rem 0.65rem', marginBottom: '0.65rem',
              border: `1px solid ${borderCard}`, borderRadius: '5px',
              background: 'rgba(0,0,0,0.3)', color: textPrimary, fontSize: '0.8rem',
            }}
          />
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {filtered.map(u => (
              <div
                key={u.canonical_acct}
                onClick={() => selectUser(u)}
                style={{
                  padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '5px',
                  background: selected === u.canonical_acct ? goldGlow : 'transparent',
                  border: selected === u.canonical_acct ? `1px solid ${goldDim}` : '1px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ flex: 1, fontSize: '0.72rem', fontFamily: 'monospace', color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.canonical_acct}</div>
                <Badge variant={u.is_stub ? 'warning' : 'success'}>{u.is_stub ? 'S' : '✓'}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Detail */}
      <div style={{ flex: 1 }}>
        {!feat && !loadingDetail && (
          <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: textMuted }}>Select a user to view their feature profile.</p>
          </div>
        )}
        {loadingDetail && <div style={{ color: textMuted, padding: '2rem', textAlign: 'center' }}>Loading...</div>}
        {feat && !loadingDetail && (
          <div style={{ background: bgCard, border: `1px solid ${borderGold}`, borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ color: textPrimary, fontSize: '1rem', fontFamily: 'monospace', margin: 0 }}>{feat.canonical_acct}</h3>
              <Badge variant={feat.is_stub ? 'warning' : 'success'}>{feat.is_stub ? 'Stub Account' : 'Complete'}</Badge>
            </div>

            <h4 style={{ color: gold, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Six MCDM Criteria</h4>
            {CRITERIA.map(c => {
              const val = feat[c] != null ? Number(feat[c]) : null;
              return (
                <div key={c} style={{ marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: textSecondary }}>{LABELS[c]}</span>
                    <span style={{ color: textPrimary, fontFamily: 'monospace' }}>{val !== null ? val.toFixed(4) : '—'}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 6 }}>
                    <div style={{ width: val !== null ? `${(val * 100).toFixed(1)}%` : '0%', background: gold, borderRadius: 3, height: '100%', transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}

            {!feat.is_stub && (
              <>
                <h4 style={{ color: gold, fontSize: '0.85rem', marginTop: '1.25rem', marginBottom: '0.5rem' }}>Behaviour Score</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: textSecondary }}>Overall</span>
                  <span style={{ color: textPrimary, fontFamily: 'monospace' }}>{feat.behaviour_score != null ? Number(feat.behaviour_score).toFixed(4) : '—'}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 6, marginBottom: '0.75rem' }}>
                  <div style={{ width: feat.behaviour_score != null ? `${(feat.behaviour_score * 100).toFixed(1)}%` : '0%', background: '#34d399', borderRadius: 3, height: '100%', transition: 'width 0.3s' }} />
                </div>

                <h4 style={{ color: gold, fontSize: '0.85rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Context Profile</h4>
                {[
                  ['Primary Language', feat.primary_language],
                  ['Top Hashtags', feat.top_hashtags],
                  ['Recent Activity', feat.recent_activity_score != null ? Number(feat.recent_activity_score).toFixed(4) : null],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
                    <span style={{ color: textMuted }}>{k}</span>
                    <span style={{ color: textPrimary, fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v ?? '—'}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 5 — TRUST / MCDM
   ═══════════════════════════════════════════════════════════ */
function TrustMCDMTab() {
  const [weights, setWeights] = useState([]);
  const [scores, setScores] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedAcct, setSelectedAcct] = useState(null);
  const [trustDetail, setTrustDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchTrustWeights(), fetchTrustScores()])
      .then(([w, s]) => { setWeights(w); setScores(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <BackendNotice />;

  const LABELS = { activity: 'Activity', popularity: 'Popularity', influence: 'Influence', community_participation: 'Comm. Part.', reciprocity: 'Reciprocity', reputation: 'Reputation' };
  const completeScores = scores.filter(s => !s.is_stub && s.trust_score !== null);
  const topScores = [...completeScores].sort((a, b) => b.trust_score - a.trust_score).slice(0, 10);
  const maxWeight = Math.max(...weights.map(w => w.weight), 0.01);

  const filtered = scores.filter(s => s.canonical_acct?.toLowerCase().includes(search.toLowerCase()));

  function selectUser(acct) {
    setSelectedAcct(acct);
    fetchTrustById(acct).then(setTrustDetail);
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <StatCard label="Users Scored" value={loading ? '…' : completeScores.length} accent />
        <StatCard label="Stubs Excluded" value={loading ? '…' : scores.filter(s => s.is_stub).length} />
        <StatCard label="Max Trust" value={loading ? '…' : completeScores.length ? Math.max(...completeScores.map(s => s.trust_score)).toFixed(4) : '—'} />
        <StatCard label="Mean Trust" value={loading ? '…' : completeScores.length ? (completeScores.reduce((s, x) => s + x.trust_score, 0) / completeScores.length).toFixed(4) : '—'} />
      </div>

      {/* MCDM Criterion Weights - horizontal bar chart via CSS */}
      <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h4 style={{ color: textPrimary, fontSize: '0.95rem', marginBottom: '1rem' }}>Derived Criterion Weights</h4>
        {weights.filter(w => LABELS[w.criterion]).sort((a, b) => b.weight - a.weight).map(w => (
          <div key={w.criterion} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.55rem' }}>
            <span style={{ width: 90, fontSize: '0.78rem', color: textSecondary, textAlign: 'right' }}>{LABELS[w.criterion]}</span>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 14 }}>
              <div style={{ width: `${(w.weight / maxWeight * 100).toFixed(1)}%`, background: `linear-gradient(90deg, ${gold}, rgba(212,168,67,0.5))`, borderRadius: 3, height: '100%', transition: 'width 0.4s' }} />
            </div>
            <span style={{ width: 70, fontSize: '0.78rem', color: gold, fontFamily: 'monospace', textAlign: 'right' }}>{w.weight.toFixed(4)}</span>
          </div>
        ))}
      </div>

      {/* User List + Detail */}
      <div style={{ display: 'flex', gap: '1.25rem' }}>
        <div style={{ width: 250, flexShrink: 0 }}>
          <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', padding: '1rem' }}>
            <h4 style={{ color: textPrimary, fontSize: '0.9rem', marginBottom: '0.65rem' }}>Trust Search</h4>
            <input placeholder="Search account..." value={search} onChange={e => setSearch(e.target.value)} style={{
              width: '100%', padding: '0.4rem 0.65rem', marginBottom: '0.65rem',
              border: `1px solid ${borderCard}`, borderRadius: '5px', background: 'rgba(0,0,0,0.3)', color: textPrimary, fontSize: '0.8rem',
            }} />
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {filtered.map(s => (
                <div key={s.canonical_acct} onClick={() => selectUser(s.canonical_acct)} style={{
                  padding: '0.4rem 0.6rem', cursor: 'pointer', borderRadius: '5px',
                  background: selectedAcct === s.canonical_acct ? goldGlow : 'transparent',
                  border: selectedAcct === s.canonical_acct ? `1px solid ${goldDim}` : '1px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem',
                }}>
                  <span style={{ flex: 1, fontSize: '0.72rem', fontFamily: 'monospace', color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.canonical_acct}</span>
                  {s.is_stub ? <Badge variant="warning">Stub</Badge> : <span style={{ fontSize: '0.72rem', fontWeight: 600, color: gold }}>{s.trust_score?.toFixed(4)}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {trustDetail ? (
            <div style={{ background: bgCard, border: `1px solid ${borderGold}`, borderRadius: '10px', padding: '1.25rem' }}>
              <h3 style={{ color: textPrimary, fontSize: '0.95rem', fontFamily: 'monospace', marginBottom: '0.5rem' }}>{trustDetail.canonical_acct}</h3>
              {trustDetail.is_stub || trustDetail.trust_score == null ? (
                <div style={{ color: textMuted, fontSize: '1.2rem', fontWeight: 700 }}>Unavailable (stub account)</div>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: gold, marginBottom: '0.5rem' }}>{Number(trustDetail.trust_score).toFixed(6)}</div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 10, marginBottom: '1.25rem' }}>
                    <div style={{ width: `${(trustDetail.trust_score * 100).toFixed(1)}%`, background: `linear-gradient(90deg, ${gold}, rgba(212,168,67,0.4))`, borderRadius: 3, height: '100%' }} />
                  </div>
                  <h4 style={{ color: textSecondary, fontSize: '0.82rem', marginBottom: '0.5rem' }}>Criterion Contributions</h4>
                  {['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation'].map(c => {
                    const contrib = trustDetail[`contrib_${c}`];
                    return (
                      <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.82rem' }}>
                        <span style={{ color: textMuted }}>{LABELS[c]}</span>
                        <span style={{ color: textPrimary, fontFamily: 'monospace' }}>{contrib != null ? Number(contrib).toFixed(6) : '—'}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 700, fontSize: '0.88rem', marginTop: '0.25rem' }}>
                    <span style={{ color: gold }}>Total</span>
                    <span style={{ color: gold, fontFamily: 'monospace' }}>{Number(trustDetail.trust_score).toFixed(6)}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', padding: '1.25rem' }}>
              <h4 style={{ color: textPrimary, fontSize: '0.95rem', marginBottom: '1rem' }}>Top 10 Trust Scores</h4>
              {loading ? <div style={{ color: textMuted }}>Loading...</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(212,168,67,0.06)' }}>
                        {['Rank', 'Account', 'Trust Score'].map(h => (
                          <th key={h} style={{ padding: '0.55rem 0.85rem', textAlign: 'left', color: gold, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: `1px solid ${borderCard}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topScores.map((s, i) => (
                        <tr key={s.canonical_acct} onClick={() => selectUser(s.canonical_acct)} style={{ cursor: 'pointer', borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.5rem 0.85rem', color: gold, fontWeight: 700 }}>#{i + 1}</td>
                          <td style={{ padding: '0.5rem 0.85rem', fontFamily: 'monospace', fontSize: '0.78rem', color: textPrimary }}>{s.canonical_acct}</td>
                          <td style={{ padding: '0.5rem 0.85rem', fontFamily: 'monospace', fontWeight: 700, color: textPrimary }}>{s.trust_score?.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 6 — RECOMMENDATIONS
   ═══════════════════════════════════════════════════════════ */
const DEFAULT_HEURISTIC_WEIGHTS = { relevance: 0.40, trust: 0.30, context: 0.15, behaviour: 0.15 };
const DEFAULT_HYBRID_WEIGHTS = { gcn: 0.35, trust: 0.30, proximity: 0.10, context: 0.15, behaviour: 0.10 };

function RecommendationsTab() {
  const [targets, setTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('Mastodon@mastodon.social');
  const [scoringMode, setScoringMode] = useState('heuristic');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [weights, setWeights] = useState(DEFAULT_HEURISTIC_WEIGHTS);
  const [diversityLambda, setDiversityLambda] = useState(0.30);
  const [topK, setTopK] = useState(10);
  const [showConfig, setShowConfig] = useState(false);
  const [backendError, setBackendError] = useState(false);

  useEffect(() => {
    fetchRecommendationTargets()
      .then(data => {
        if (Array.isArray(data)) {
          setTargets(data);
          if (data.length > 0 && !selectedTarget) setSelectedTarget(data[0].canonical_acct);
        }
      })
      .catch(() => setBackendError(true));
  }, []);

  useEffect(() => {
    if (!selectedTarget) return;
    setLoading(true); setError(null);
    fetchRecommendations(selectedTarget, scoringMode)
      .then(data => {
        if (data.error) setError(data.error);
        else setRecommendations(data);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [selectedTarget, scoringMode]);

  const handleModeChange = (newMode) => {
    setScoringMode(newMode);
    setWeights(newMode === 'hybrid_lightgcn' ? DEFAULT_HYBRID_WEIGHTS : DEFAULT_HEURISTIC_WEIGHTS);
  };

  const handleApplyCustom = async () => {
    setCalculating(true); setError(null);
    try {
      const res = await fetchCustomRecommendations({ target_acct: selectedTarget, scoring_mode: scoringMode, weights, diversity_lambda: diversityLambda, top_k: topK });
      if (res.error) setError(res.error);
      else setRecommendations(res);
    } catch (err) { setError(err.message); }
    finally { setCalculating(false); }
  };

  if (backendError) return <BackendNotice />;

  const currentTargetMeta = targets.find(t => t.canonical_acct === selectedTarget);

  const weightKeys = scoringMode === 'hybrid_lightgcn'
    ? [['gcn', 'LightGCN Affinity', 0.35], ['trust', 'Trust', 0.30], ['proximity', 'Proximity', 0.10], ['context', 'Context', 0.15], ['behaviour', 'Behaviour', 0.10]]
    : [['relevance', 'Relevance', 0.40], ['trust', 'Trust', 0.30], ['context', 'Context', 0.15], ['behaviour', 'Behaviour', 0.15]];

  return (
    <div>
      {/* Controls */}
      <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: gold, textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '0.03em' }}>Target Account</label>
            <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} style={{
              width: '100%', padding: '0.5rem 0.7rem', borderRadius: '5px',
              border: `1px solid ${borderCard}`, fontSize: '0.82rem',
              background: 'rgba(0,0,0,0.3)', color: textPrimary,
            }}>
              {targets.map(t => (
                <option key={t.canonical_acct} value={t.canonical_acct}>
                  {t.canonical_acct} (Comm #{t.community_id ?? '?'}, Trust: {t.trust_score ? t.trust_score.toFixed(3) : '0.000'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: gold, textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '0.03em' }}>Scoring Engine</label>
            <select value={scoringMode} onChange={e => handleModeChange(e.target.value)} style={{
              width: '100%', padding: '0.5rem 0.7rem', borderRadius: '5px',
              border: `1px solid ${scoringMode === 'hybrid_lightgcn' ? gold : borderCard}`,
              fontSize: '0.82rem', background: scoringMode === 'hybrid_lightgcn' ? goldGlow : 'rgba(0,0,0,0.3)',
              color: scoringMode === 'hybrid_lightgcn' ? gold : textPrimary, fontWeight: 600,
            }}>
              <option value="heuristic">Heuristic Engine (Baseline)</option>
              <option value="hybrid_lightgcn">LightGCN + Trust Hybrid (Stage 3)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowConfig(!showConfig)} style={{
              padding: '0.5rem 0.9rem', borderRadius: '5px', border: `1px solid ${borderCard}`,
              background: showConfig ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: textSecondary, fontSize: '0.8rem', cursor: 'pointer',
            }}>{showConfig ? 'Hide Config' : '⚙ Weights'}</button>
            <button onClick={handleApplyCustom} disabled={calculating || loading} style={{
              padding: '0.5rem 1rem', borderRadius: '5px', border: `1px solid ${gold}`,
              background: goldGlow, color: gold, fontSize: '0.8rem', fontWeight: 600,
              cursor: (calculating || loading) ? 'not-allowed' : 'pointer',
              opacity: (calculating || loading) ? 0.5 : 1,
            }}>{calculating ? 'Re-ranking...' : 'Recalculate'}</button>
          </div>
        </div>

        {/* Weight Tuning Panel */}
        {showConfig && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: `1px solid ${borderCard}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {weightKeys.map(([key, label, def]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: textSecondary }}>{label}:</span>
                    <strong style={{ color: gold }}>{(weights[key] ?? def).toFixed(2)}</strong>
                  </div>
                  <input type="range" min="0" max="1" step="0.05"
                    value={weights[key] ?? def}
                    onChange={e => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: gold }}
                  />
                </div>
              ))}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: textSecondary }}>Diversity λ:</span>
                  <strong style={{ color: gold }}>{diversityLambda.toFixed(2)}</strong>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={diversityLambda}
                  onChange={e => setDiversityLambda(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: gold }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: textSecondary }}>Top-K:</span>
                  <strong style={{ color: gold }}>{topK}</strong>
                </div>
                <input type="range" min="3" max="20" step="1" value={topK}
                  onChange={e => setTopK(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: gold }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target Summary */}
      {currentTargetMeta && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <StatCard label="Target Community" value={`#${currentTargetMeta.community_id ?? 'N/A'}`} />
          <StatCard label="MCDM Trust" value={currentTargetMeta.trust_score ? currentTargetMeta.trust_score.toFixed(4) : 'N/A'} accent />
          <StatCard label="Active Engine" value={scoringMode === 'hybrid_lightgcn' ? 'LightGCN Hybrid' : 'Heuristic'} />
          <StatCard label="Top-K" value={recommendations?.top_k ?? topK} />
        </div>
      )}

      {/* Loading / Error */}
      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: textMuted }}>Computing rankings...</div>}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <strong style={{ color: '#f87171' }}>Notice:</strong>
          <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</div>
        </div>
      )}

      {/* Recommendation Cards */}
      {!loading && !error && recommendations && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: textPrimary, fontSize: '1.05rem', margin: 0 }}>
              Ranked Recommendations ({recommendations.recommendations?.length || 0})
            </h3>
            <span style={{ fontSize: '0.75rem', color: textMuted }}>
              Mode: <strong style={{ color: gold }}>{recommendations.scoring_mode || scoringMode}</strong> · {formatSnapshotDate(recommendations.timestamp)}
            </span>
          </div>

          {(!recommendations.recommendations || recommendations.recommendations.length === 0) ? (
            <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: '10px', padding: '2rem', textAlign: 'center', color: textMuted }}>
              No candidate accounts generated.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recommendations.recommendations.map(rec => {
                const expl = rec.explanation || {};
                const scores = rec.scores || {};
                const isHybrid = rec.scoring_mode === 'hybrid_lightgcn' || scores.gcn !== undefined;
                const scoreKeys = isHybrid
                  ? [['gcn', 'LightGCN'], ['trust', 'Trust'], ['proximity', 'Proximity'], ['context', 'Context'], ['behaviour', 'Behaviour']]
                  : [['relevance', 'Relevance'], ['trust', 'Trust'], ['context', 'Context'], ['behaviour', 'Behaviour']];

                return (
                  <div key={rec.candidate_acct} style={{
                    background: bgCard,
                    border: `1px solid ${rec.rank <= 3 ? borderGold : borderCard}`,
                    borderRadius: '10px',
                    padding: '1.15rem',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: '50%',
                          background: rec.rank <= 3 ? `linear-gradient(135deg, ${gold}, rgba(212,168,67,0.6))` : 'rgba(255,255,255,0.08)',
                          color: rec.rank <= 3 ? '#000' : textPrimary,
                          fontWeight: 800, fontSize: '0.8rem',
                        }}>{rec.rank}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: textPrimary }}>{rec.candidate_acct}</div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                            <Badge>Community #{rec.candidate_community}</Badge>
                            {rec.is_exploration && <Badge variant="gold">Cross-Community</Badge>}
                            {isHybrid && <Badge variant="gold">LightGCN Hybrid</Badge>}
                            {rec.is_cold_start_source && <Badge variant="warning">Cold-Start</Badge>}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Overall Score</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: gold }}>{rec.overall_score !== undefined ? rec.overall_score.toFixed(4) : '0.0000'}</div>
                      </div>
                    </div>

                    {/* Sub-scores */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem',
                      padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.04)`,
                      borderRadius: '6px', marginBottom: '0.65rem',
                    }}>
                      {scoreKeys.map(([k, label]) => (
                        <div key={k}>
                          <div style={{ fontSize: '0.65rem', color: textMuted, textTransform: 'uppercase' }}>{label}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: textPrimary }}>{scores[k] !== undefined ? scores[k].toFixed(3) : '—'}</div>
                        </div>
                      ))}
                      {rec.diversity_contribution > 0 && (
                        <div>
                          <div style={{ fontSize: '0.65rem', color: textMuted, textTransform: 'uppercase' }}>Diversity</div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#34d399' }}>+{rec.diversity_contribution.toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    <div style={{ borderLeft: `3px solid ${gold}`, paddingLeft: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: textPrimary, marginBottom: '0.25rem' }}>
                        {expl.primary_reason || 'Evidence-based justification:'}
                      </div>
                      {expl.evidence_bullets && expl.evidence_bullets.length > 0 && (
                        <ul style={{ margin: '0 0 0.35rem 1rem', padding: 0, fontSize: '0.78rem', color: textSecondary, lineHeight: '1.5' }}>
                          {expl.evidence_bullets.map((b, i) => <li key={i} style={{ marginBottom: '0.15rem' }}>{b}</li>)}
                        </ul>
                      )}
                      {expl.missing_data_notice && (
                        <div style={{ fontSize: '0.72rem', color: textMuted, fontStyle: 'italic' }}>{expl.missing_data_notice}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN LIVE DEMO COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LiveDemo() {
  const [activeTab, setActiveTab] = useState('pipeline');

  const tabs = [
    { id: 'pipeline', label: 'Pipeline Overview', icon: '🏗️' },
    { id: 'graph', label: 'Social Graph', icon: '🔗' },
    { id: 'data', label: 'Data Explorer', icon: '📊' },
    { id: 'features', label: 'Feature Profiles', icon: '🧬' },
    { id: 'trust', label: 'Trust / MCDM', icon: '🛡️' },
    { id: 'recommendations', label: 'Recommendations', icon: '⭐' },
  ];

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Interactive Research Dashboard</span>
          <h2>Live System Demo</h2>
          <p className="section-description">
            Explore the complete CBT-Rec layered pipeline — from raw Mastodon data collection to trust-aware account recommendations with interactive graph visualizations, feature profiles, MCDM trust scoring, and the recommendation engine.
          </p>
        </div>

        {/* Tab navigation */}
        <SubTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <div style={{ minHeight: '500px' }}>
          {activeTab === 'pipeline' && <PipelineOverview />}
          {activeTab === 'graph' && <SocialGraphTab />}
          {activeTab === 'data' && <DataExplorerTab />}
          {activeTab === 'features' && <FeatureProfilesTab />}
          {activeTab === 'trust' && <TrustMCDMTab />}
          {activeTab === 'recommendations' && <RecommendationsTab />}
        </div>
      </div>
    </div>
  );
}
