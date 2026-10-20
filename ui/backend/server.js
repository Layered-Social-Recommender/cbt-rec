const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

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

/**
 * sanitiseTimestamp(ts)
 * Normalise stored ISO-8601 timestamps before sending to the browser.
 *
 * Problem: older precomputed rows in user_recommendations were written with the
 * string "2026-10-18T22:14:09.778687+00:00Z" — a doubly-suffixed value that
 * JavaScript's Date constructor cannot parse (produces "Invalid Date").
 *
 * The double suffix arises because Python's datetime.isoformat() produces
 * "...+00:00" and an early version of the code appended "Z" without first
 * stripping "+00:00", resulting in "...+00:00Z".
 *
 * Fix: strip "+00:00Z" → "Z", and "+00:00" → "Z", leaving already-correct
 * "...Z" strings unchanged.  Returns null for missing/non-string input.
 */
function sanitiseTimestamp(ts) {
    if (!ts || typeof ts !== 'string') return null;
    // "+00:00Z" (double suffix) → "Z"
    ts = ts.replace(/\+00:00Z$/, 'Z');
    // "+00:00" (offset without trailing Z) → "Z"
    ts = ts.replace(/\+00:00$/, 'Z');
    return ts;
}

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

// 6. Recommendation Engine (Layer 5 & 6)
const projectRoot = path.resolve(__dirname, '../../');
const venvPythonWin = path.join(projectRoot, 'venv', 'Scripts', 'python.exe');
const pythonCmd = fs.existsSync(venvPythonWin) ? venvPythonWin : 'python';

app.get('/api/recommendations/targets', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT u.canonical_acct, u.display_name, gm.community_id, ut.trust_score, uf.features_complete
            FROM users u
            LEFT JOIN graph_metrics gm ON u.canonical_acct = gm.canonical_acct
            LEFT JOIN user_trust ut ON u.canonical_acct = ut.canonical_acct
            LEFT JOIN user_features uf ON u.canonical_acct = uf.canonical_acct
            WHERE uf.features_complete = 1
            ORDER BY ut.trust_score DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/recommendations/:id', async (req, res) => {
    try {
        const target = req.params.id;
        const scoringMode = req.query.scoring_mode || 'heuristic';

        // Only serve precomputed DB rows if requesting default heuristic mode
        if (scoringMode === 'heuristic') {
            const rows = await dbAll(`
                SELECT * FROM user_recommendations 
                WHERE target_canonical = ? 
                ORDER BY rank ASC
            `, [target]);

            if (rows && rows.length > 0) {
                const formatted = rows.map(r => ({
                    rank: r.rank,
                    candidate_acct: r.candidate_canonical,
                    overall_score: r.overall_score,
                    scores: {
                        relevance: r.relevance_score,
                        trust: r.trust_score,
                        context: r.context_score,
                        behaviour: r.behaviour_score,
                        composite: r.overall_score
                    },
                    target_community: r.target_community,
                    candidate_community: r.candidate_community,
                    is_exploration: Boolean(r.is_exploration),
                    source_type: r.source_type,
                    missing_flags: r.missing_flags ? JSON.parse(r.missing_flags) : {},
                    explanation: r.explanation_json ? JSON.parse(r.explanation_json) : {}
                }));

                const targetInfo = await dbGet('SELECT community_id FROM graph_metrics WHERE canonical_acct = ?', [target]);

                return res.json({
                    status: 'success',
                    target_acct: target,
                    target_community: targetInfo ? targetInfo.community_id : -1,
                    recommendations: formatted,
                    source: 'database_precomputed',
                    algorithm_version: rows[0].algorithm_version || 'CBT-Rec-v1.0-Hybrid-MMR',
                    timestamp: sanitiseTimestamp(rows[0].created_at)
                });
            }
        }

        const args = ['-m', 'src.recommendation_layer.engine', '--target', target, '--scoring_mode', scoringMode, '--json'];
        execFile(pythonCmd, args, { cwd: projectRoot }, (error, stdout, stderr) => {
            if (error) {
                console.error('Python recommendation error:', stderr);
                return res.status(500).json({ error: 'Failed to compute recommendations', details: stderr || error.message });
            }
            try {
                const parsed = JSON.parse(stdout);
                res.json(parsed);
            } catch (pErr) {
                res.status(500).json({ error: 'Failed to parse recommendation output', details: pErr.message });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recommendations/custom', async (req, res) => {
    try {
        const { target_acct, weights, diversity_lambda, top_k, scoring_mode } = req.body;
        if (!target_acct) {
            return res.status(400).json({ error: 'target_acct is required' });
        }

        const activeScoringMode = scoring_mode === 'hybrid_lightgcn' ? 'hybrid_lightgcn' : 'heuristic';

        const args = [
            '-m', 'src.recommendation_layer.engine',
            '--target', target_acct,
            '--scoring_mode', activeScoringMode,
            '--top_k', String(top_k || 10),
            '--lambda_div', String(diversity_lambda !== undefined ? diversity_lambda : 0.30),
            '--json'
        ];

        if (activeScoringMode === 'hybrid_lightgcn') {
            if (weights?.gcn !== undefined) args.push('--w_gcn', String(weights.gcn));
            if (weights?.trust !== undefined) args.push('--w_trust', String(weights.trust));
            if (weights?.proximity !== undefined) args.push('--w_prox', String(weights.proximity));
            if (weights?.context !== undefined) args.push('--w_ctx', String(weights.context));
            if (weights?.behaviour !== undefined) args.push('--w_beh', String(weights.behaviour));
        } else {
            args.push(
                '--w_rel', String(weights?.relevance !== undefined ? weights.relevance : 0.40),
                '--w_trust', String(weights?.trust !== undefined ? weights.trust : 0.30),
                '--w_ctx', String(weights?.context !== undefined ? weights.context : 0.15),
                '--w_beh', String(weights?.behaviour !== undefined ? weights.behaviour : 0.15)
            );
        }

        execFile(pythonCmd, args, { cwd: projectRoot }, (error, stdout, stderr) => {
            if (error) {
                console.error('Python recommendation error:', stderr);
                return res.status(500).json({ error: 'Failed to compute custom recommendations', details: stderr || error.message });
            }
            try {
                const parsed = JSON.parse(stdout);
                res.json(parsed);
            } catch (pErr) {
                res.status(500).json({ error: 'Failed to parse recommendation output', details: pErr.message });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});
