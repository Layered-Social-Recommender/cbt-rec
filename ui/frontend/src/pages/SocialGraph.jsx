import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { fetchGraphNodes, fetchGraphEdges, fetchGraphMetrics, fetchInteractionCounts } from '../api';

const COMMUNITY_PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316',
  '#84cc16','#6366f1','#14b8a6','#e11d48','#a855f7','#0ea5e9','#22c55e','#eab308'
];
function communityColor(cid) {
  if (cid === null || cid === undefined) return '#94a3b8';
  return COMMUNITY_PALETTE[cid % COMMUNITY_PALETTE.length];
}

export default function SocialGraph() {
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
  const graphRef = useRef();

  useEffect(() => {
    Promise.all([
      fetchGraphNodes(),
      fetchGraphEdges('follow'),
      fetchGraphEdges('interaction'),
      fetchGraphMetrics(),
      fetchInteractionCounts()
    ]).then(([n, fe, ie, m, ic]) => {
      setNodes(n);
      setFollowEdges(fe);
      setIntEdges(ie);
      setMetrics(m);
      setIntCounts(ic);
    }).finally(() => setLoading(false));
  }, []);

  const communities = [...new Set(nodes.map(n => n.community))].filter(c => c !== null && c !== undefined).sort((a, b) => a - b);

  const visibleNodes = nodes.filter(n => {
    if (!showStubs && n.is_stub) return false;
    if (communityFilter !== 'all' && n.community !== Number(communityFilter)) return false;
    if (search && !n.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const visibleIds = new Set(visibleNodes.map(n => n.id));

  let edges = [];
  if (graphType === 'follow') edges = followEdges;
  else if (graphType === 'interaction') edges = intEdges;
  else edges = [...followEdges, ...intEdges];

  const visibleEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

  const graphData = {
    nodes: visibleNodes.map(n => ({ ...n })),
    links: visibleEdges.map(e => ({ source: e.source, target: e.target, label: e.label }))
  };

  // Raw interaction counts come from the dedicated /api/graph/interaction-counts endpoint
  // (SELECT type, COUNT(*) FROM interactions GROUP BY type) to match validated Layer 2 results.
  // Do NOT derive these from intEdges.length — that counts unique (source,target,type) pairs, not records.
  const replyCount = intCounts.reply ?? 0;
  const mentionCount = intCounts.mention ?? 0;
  const reblogCount = intCounts.reblog ?? 0;
  const uniquePairs = new Set(intEdges.map(e => `${e.source}→${e.target}`)).size;

  const edgeColor = (link) => {
    if (link.label === 'follows') return 'rgba(113, 113, 122, 0.4)';
    if (link.label === 'reply') return 'rgba(82, 82, 91, 0.7)';
    if (link.label === 'mention') return 'rgba(161, 161, 170, 0.7)';
    if (link.label === 'reblog') return 'rgba(212, 212, 212, 0.8)';
    return 'rgba(161, 161, 170, 0.4)';
  };

  return (
    <div>
      <h1 className="page-title">Social Graph</h1>
      <p className="page-subtitle">Layer 2 — Social graph topology and metrics</p>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <strong>Methodology note:</strong> PageRank, in-degree, out-degree, and <em>clustering coefficient</em> are computed on the <em>Follow Graph</em>. Louvain community detection runs on the Follow Graph. Interaction frequencies (replies, mentions, reblogs) are computed separately on the <em>Interaction Graph</em>. Communities are detected within the bounded 270-account research subgraph — they do not represent platform-wide Mastodon communities.
      </div>

      <div className="stats-grid">
        {[
          [String(nodes.length), 'Nodes'],
          [String(followEdges.length + intEdges.length), 'Master Graph Edges'],
          [String(followEdges.length), 'Follow Edges'],
          [String(uniquePairs), 'Interaction Pairs'],
          [String(replyCount), 'Replies'],
          [String(mentionCount), 'Mentions'],
          [String(reblogCount), 'Reblogs'],
          [metrics ? String(metrics.communities) : '…', 'Structural Communities'],
        ].map(([val, label]) => (
          <div className="stat-card" key={label}>
            <div className="stat-value" style={{ fontSize: '1.75rem' }}>{loading ? '…' : val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.85rem', color: '#71717a' }}>
          Structural communities detected in the collected research subgraph. This represents the topology of the bounded dataset — not the Mastodon platform globally.
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: '0.5rem' }}>Graph View:</label>
            {[['follow', 'Follow Graph'], ['interaction', 'Interaction Graph'], ['master', 'Master Graph']].map(([v, l]) => (
              <button key={v} onClick={() => setGraphType(v)} style={{ marginRight: '0.5rem', padding: '0.4rem 0.9rem', borderRadius: '0.25rem', border: '1px solid #d4d4d4', background: graphType === v ? '#171717' : '#fff', color: graphType === v ? '#fff' : '#171717', cursor: 'pointer', fontWeight: graphType === v ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          <input placeholder="Search node..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #d4d4d4', borderRadius: '0.25rem', fontSize: '0.9rem' }} />
          <select value={communityFilter} onChange={e => setCommunityFilter(e.target.value)} style={{ padding: '0.4rem 0.75rem', border: '1px solid #d4d4d4', borderRadius: '0.25rem', fontSize: '0.9rem' }}>
            <option value="all">All Communities</option>
            {communities.slice(0, 50).map(c => <option key={c} value={c}>Community {c}</option>)}
          </select>
          <label style={{ fontSize: '0.85rem' }}>
            <input type="checkbox" checked={showStubs} onChange={e => setShowStubs(e.target.checked)} style={{ marginRight: '0.25rem' }} />
            Show Stub Nodes
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ flex: 1, border: '1px solid #d4d4d4', borderRadius: '0.25rem', overflow: 'hidden', background: '#ffffff', minHeight: 550 }}>
            {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 550, color: '#71717a' }}>Loading graph data...</div> : (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeId="id"
                nodeLabel={n => `${n.id}\nCommunity: ${n.community ?? 'N/A'}\nPageRank: ${n.pagerank?.toFixed(4) ?? 'N/A'}\nIn-degree: ${n.inDegree ?? 'N/A'}`}
                nodeColor={n => communityColor(n.community)}
                nodeRelSize={4}
                nodeVal={n => Math.max(2, (n.inDegree || 0) * 0.5)}
                linkColor={edgeColor}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                linkWidth={1}
                onNodeClick={n => setSelectedNode(n)}
                width={650}
                height={550}
              />
            )}
          </div>

          <div style={{ width: 280, flexShrink: 0 }}>
            {selectedNode ? (
              <div className="card" style={{ margin: 0 }}>
                <h2>Node Details</h2>
                <table>
                  <tbody>
                    <tr><td style={{ color: '#71717a' }}>Account</td><td style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{selectedNode.id}</td></tr>
                    <tr><td style={{ color: '#71717a' }}>Community</td><td>{selectedNode.community ?? '—'}</td></tr>
                    <tr><td style={{ color: '#71717a' }}>In-degree</td><td>{selectedNode.inDegree ?? '—'}</td></tr>
                    <tr><td style={{ color: '#71717a' }}>Out-degree</td><td>{selectedNode.outDegree ?? '—'}</td></tr>
                    <tr><td style={{ color: '#71717a' }}>PageRank</td><td>{selectedNode.pagerank?.toFixed(6) ?? '—'}</td></tr>
                    <tr><td style={{ color: '#71717a' }}>Clustering (Follow Graph)</td><td>{selectedNode.clustering?.toFixed(6) ?? '—'}</td></tr>
                    <tr><td style={{ color: '#71717a' }}>Status</td><td><span className={`badge ${selectedNode.is_stub ? 'badge-warning' : 'badge-success'}`}>{selectedNode.is_stub ? 'Stub' : 'Complete'}</span></td></tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ margin: 0 }}>
                <h2>Node Details</h2>
                <p style={{ color: '#71717a', fontSize: '0.9rem' }}>Click a node to view its graph metrics.</p>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Edge Legend</div>
                  {graphType !== 'follow' && <>
                    {[['Reply', '#52525b'], ['Mention', '#a1a1aa'], ['Reblog', '#d4d4d4']].map(([l, c]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                      </div>
                    ))}
                  </>}
                  {graphType !== 'interaction' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#71717a', display: 'inline-block' }} />Follow
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
