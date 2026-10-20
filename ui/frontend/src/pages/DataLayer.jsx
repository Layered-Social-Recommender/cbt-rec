import { useEffect, useState } from 'react';
import { fetchUsers, fetchRelationships, fetchStatuses, fetchInteractions } from '../api';

function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

const PAGE_SIZE_USERS = 100;

function PaginationControls({ page, totalPages, onPrev, onNext, startIdx, endIdx, total, entityName }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#71717a' }}>
        Showing {total === 0 ? 0 : startIdx + 1}–{endIdx} of {total} {entityName}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={onPrev}
          disabled={page === 1}
          style={{
            padding: '0.35rem 0.75rem', border: '1px solid #d4d4d4', borderRadius: '0.25rem',
            background: page === 1 ? '#f4f4f5' : '#ffffff', color: page === 1 ? '#a1a1aa' : '#171717',
            cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500
          }}
        >← Prev</button>
        <span style={{ fontSize: '0.85rem', color: '#52525b', padding: '0 0.25rem' }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page === totalPages}
          style={{
            padding: '0.35rem 0.75rem', border: '1px solid #d4d4d4', borderRadius: '0.25rem',
            background: page === totalPages ? '#f4f4f5' : '#ffffff', color: page === totalPages ? '#a1a1aa' : '#171717',
            cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500
          }}
        >Next →</button>
      </div>
    </div>
  );
}

function UsersTab({ users }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  // Reset to page 1 whenever search changes
  const filtered = users.filter(u =>
    u.canonical_acct?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_USERS));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE_USERS;
  const endIdx = Math.min(startIdx + PAGE_SIZE_USERS, filtered.length);
  const displayed = filtered.slice(startIdx, endIdx);

  function handleSearch(e) {
    setSearch(e.target.value);
    setPage(1); // always reset to page 1 on new search
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <input
          className="search-input"
          placeholder="Search by account… (searches all 270)"
          value={search}
          onChange={handleSearch}
          style={{ margin: 0, flex: 1, minWidth: 200 }}
        />
      </div>

      <PaginationControls
        page={safePage}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        startIdx={startIdx}
        endIdx={endIdx}
        total={filtered.length}
        entityName={search ? 'matching accounts' : 'observed accounts'}
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Account</th>
              <th>Followers</th>
              <th>Following</th>
              <th>Profile Status Count</th>
              <th>Bot</th>
              <th>Stub</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((u, i) => (
              <tr key={u.canonical_acct} style={{ cursor: 'pointer' }} onClick={() => setSelected(u)}>
                <td style={{ color: '#71717a', fontSize: '0.78rem', width: 40 }}>{startIdx + i + 1}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.canonical_acct}</td>
                <td>{fmt(u.followers_count)}</td>
                <td>{fmt(u.following_count)}</td>
                <td>{fmt(u.statuses_count)}</td>
                <td>
                  <span className={`badge ${u.bot ? 'badge-warning' : 'badge-muted'}`}>
                    {u.bot ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.is_stub ? 'badge-warning' : 'badge-success'}`}>
                    {u.is_stub ? 'Stub' : 'Complete'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination repeat for convenience */}
      <div style={{ marginTop: '0.75rem' }}>
        <PaginationControls
          page={safePage}
          totalPages={totalPages}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
          startIdx={startIdx}
          endIdx={endIdx}
          total={filtered.length}
          entityName={search ? 'matching accounts' : 'observed accounts'}
        />
      </div>

      {selected && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: 420, height: '100vh',
          background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          padding: '2rem', overflowY: 'auto', zIndex: 1000
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', cursor: 'pointer', border: '1px solid #d4d4d4', borderRadius: '0.25rem', background: '#ffffff', color: '#171717' }}
          >✕ Close</button>
          <h3 style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '1rem' }}>
            {selected.canonical_acct}
          </h3>
          {selected.is_stub === 1 && (
            <div className="alert alert-warning">Stub account — limited profile data available.</div>
          )}
          {selected.bot === 1 && (
            <div className="alert alert-warning" style={{ marginTop: '0.5rem' }}>Bot account (bot = true in source data).</div>
          )}
          <table>
            <tbody>
              {Object.entries(selected).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ fontWeight: 600, color: '#71717a', paddingRight: '1rem' }}>{k}</td>
                  <td>{fmt(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const PAGE_SIZE_TABLE = 100;

function SimpleTable({ rows, cols, entityName }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE_TABLE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE_TABLE;
  const endIdx = Math.min(startIdx + PAGE_SIZE_TABLE, rows.length);
  const displayed = rows.slice(startIdx, endIdx);

  return (
    <>
      <PaginationControls
        page={safePage}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        startIdx={startIdx}
        endIdx={endIdx}
        total={rows.length}
        entityName={entityName}
      />
      <div className="table-container">
        <table>
          <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {displayed.map((r, i) => (
              <tr key={startIdx + i}>
                {cols.map(c => (
                  <td key={c} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{fmt(r[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ marginTop: '0.75rem' }}>
          <PaginationControls
            page={safePage}
            totalPages={totalPages}
            onPrev={() => setPage(p => Math.max(1, p - 1))}
            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
            startIdx={startIdx}
            endIdx={endIdx}
            total={rows.length}
            entityName={entityName}
          />
        </div>
      )}
    </>
  );
}

export default function DataLayer() {
  const [users, setUsers] = useState([]);
  const [rels, setRels] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [ints, setInts] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchRelationships(), fetchStatuses(), fetchInteractions()])
      .then(([u, r, s, i]) => { setUsers(u); setRels(r); setStatuses(s); setInts(i); })
      .finally(() => setLoading(false));
  }, []);

  const completeUsers = users.filter(u => !u.is_stub).length;
  const stubUsers = users.filter(u => u.is_stub).length;
  const botUsers = users.filter(u => u.bot).length;

  return (
    <div>
      <h1 className="page-title">Data Layer</h1>
      <p className="page-subtitle">Collected Mastodon network data — Layer 1 outputs</p>

      <div className="stats-grid">
        {[
          ['Observed Accounts', users.length],
          ['Complete Accounts', completeUsers],
          ['Stub Accounts', stubUsers],
          ['Bot Accounts', botUsers],
          ['Follow Relationships', rels.length],
          ['Collected Statuses', statuses.length],
          ['Interaction Records', ints.length],
        ].map(([label, val]) => (
          <div className="stat-card" key={label}>
            <div className="stat-value">{loading ? '…' : val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Data Explorer</h2>
        <div className="tabs">
          {[
            ['users', `Users (${users.length})`],
            ['rels', `Relationships (${rels.length})`],
            ['statuses', `Statuses (${statuses.length})`],
            ['ints', `Interactions (${ints.length})`]
          ].map(([k, l]) => (
            <div key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{loading ? k : l}</div>
          ))}
        </div>
        {loading ? <p>Loading...</p> : (
          <>
            {tab === 'users' && <UsersTab users={users} />}
            {tab === 'rels' && (
              <SimpleTable
                rows={rels}
                cols={['source_canonical', 'target_canonical', 'type']}
                entityName="follow relationships"
              />
            )}
            {tab === 'statuses' && (
              <SimpleTable
                rows={statuses}
                cols={['account_canonical', 'status_id', 'created_at', 'language', 'is_reblog', 'reblogs_count', 'favourites_count']}
                entityName="collected statuses"
              />
            )}
            {tab === 'ints' && (
              <SimpleTable
                rows={ints}
                cols={['source_canonical', 'target_canonical', 'type', 'timestamp']}
                entityName="interaction records"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
