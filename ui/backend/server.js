const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.resolve(__dirname, '../../data/processed/mastodon/cbt_rec_dataset.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database at:', dbPath);
    }
});

// Helper for DB queries
const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbGet = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// --- ENDPOINTS ---

// 1. Dashboard Summary
app.get('/api/summary', async (req, res) => {
    try {
        const usersCount = (await dbGet('SELECT COUNT(*) as c FROM users')).c;
        const completeUsers = (await dbGet('SELECT COUNT(*) as c FROM user_features WHERE features_complete = 1')).c;
        const stubUsers = usersCount - completeUsers;
        
        const relCount = (await dbGet('SELECT COUNT(*) as c FROM relationships')).c;
        const statusCount = (await dbGet('SELECT COUNT(*) as c FROM statuses')).c;
        const intCount = (await dbGet('SELECT COUNT(*) as c FROM interactions')).c;
        
        const followCount = (await dbGet("SELECT COUNT(*) as c FROM relationships WHERE type='follows'")).c;
        
        res.json({
            users: usersCount,
            completeUsers,
            stubUsers,
            relationships: relCount,
            statuses: statusCount,
            interactions: intCount,
            followEdges: followCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Data Layer
app.get('/api/users', async (req, res) => {
    try {
        const users = await dbAll('SELECT * FROM users');
        const stubs = await dbAll('SELECT canonical_acct, is_stub FROM user_features');
        const stubMap = {};
        stubs.forEach(s => stubMap[s.canonical_acct] = s.is_stub);
        const merged = users.map(u => ({...u, is_stub: stubMap[u.canonical_acct] || 0}));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/relationships', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM relationships LIMIT 1000');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/statuses', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM statuses LIMIT 1000');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/interactions', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM interactions LIMIT 1000');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Social Graph
app.get('/api/graph/metrics', async (req, res) => {
    try {
        const communities = (await dbGet('SELECT COUNT(DISTINCT community_id) as c FROM graph_metrics')).c;
        res.json({ communities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/graph/nodes', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM graph_metrics');
        const stubs = await dbAll('SELECT canonical_acct, is_stub FROM user_features');
        const stubMap = {};
        stubs.forEach(s => stubMap[s.canonical_acct] = s.is_stub);
        const nodes = rows.map(r => ({
            id: r.canonical_acct,
            community: r.community_id,
            inDegree: r.in_degree,
            outDegree: r.out_degree,
            pagerank: r.pagerank,
            clustering: r.clustering_coefficient,
            is_stub: stubMap[r.canonical_acct] || 0
        }));
        res.json(nodes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/graph/edges', async (req, res) => {
    const type = req.query.type; // 'follow' or 'interaction'
    try {
        if (type === 'follow') {
            const edges = await dbAll("SELECT source_canonical as source, target_canonical as target, 'follows' as label FROM relationships WHERE type='follows'");
            res.json(edges);
        } else if (type === 'interaction') {
            const edges = await dbAll("SELECT source_canonical as source, target_canonical as target, type as label, COUNT(*) as weight FROM interactions GROUP BY source_canonical, target_canonical, type");
            res.json(edges);
        } else {
            const rels = await dbAll("SELECT source_canonical as source, target_canonical as target, type as label FROM relationships WHERE type='follows'");
            const ints = await dbAll("SELECT source_canonical as source, target_canonical as target, type as label, COUNT(*) as weight FROM interactions GROUP BY source_canonical, target_canonical, type");
            res.json([...rels, ...ints]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/graph/interaction-counts', async (req, res) => {
    try {
        const rows = await dbAll('SELECT type, COUNT(*) as count FROM interactions GROUP BY type');
        // Return as a flat object: { reply: 13, mention: 33, reblog: 82 }
        const counts = {};
        rows.forEach(r => { counts[r.type] = r.count; });
        res.json(counts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Features
app.get('/api/features', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM user_features');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/features/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const feat = await dbGet('SELECT * FROM user_features WHERE canonical_acct = ?', [id]);
        if (!feat) return res.status(404).json({error: 'Not found'});
        
        // Compute behaviour components on the fly if not stub
        if (!feat.is_stub) {
            const metrics = await dbGet('SELECT reply_weight_out, reblog_weight_out, mention_weight_out FROM graph_metrics WHERE canonical_acct = ?', [id]);
            const statuses = await dbAll('SELECT created_at FROM statuses WHERE account_canonical = ?', [id]);
            const s_count = Math.max(1, statuses.length);
            
            if (metrics) {
                feat.reply_ratio = metrics.reply_weight_out / s_count;
                feat.reblog_ratio = metrics.reblog_weight_out / s_count;
                feat.mention_ratio = metrics.mention_weight_out / s_count;
            }
            
            if (statuses.length > 1) {
                const dates = statuses.map(s => new Date(s.created_at).toISOString().split('T')[0]);
                const uniqueDates = new Set(dates);
                const activeDays = uniqueDates.size;
                const sortedDates = [...uniqueDates].sort();
                const firstDate = new Date(sortedDates[0]);
                const lastDate = new Date(sortedDates[sortedDates.length - 1]);
                const windowDays = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
                feat.posting_regularity = windowDays >= 2 ? activeDays / windowDays : 0.0;
            } else {
                feat.posting_regularity = 0.0;
            }
        }
        
        res.json(feat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Trust & MCDM
app.get('/api/trust/weights', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM mcdm_weights');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/trust/scores', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM user_trust');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/trust/scores/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const trust = await dbGet('SELECT * FROM user_trust WHERE canonical_acct = ?', [id]);
        if (!trust) return res.status(404).json({error: 'Not found'});
        res.json(trust);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});
