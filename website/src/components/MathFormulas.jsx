import React from 'react';

/**
 * Converts a plain-text math string to proper HTML with sub/sup tags.
 * Handles:
 *   x_ij   → x<sub>ij</sub>
 *   x^(2)  → x<sup>(2)</sup>
 *   P_bar_j → P̄<sub>j</sub>   (using overline via combining char for _bar)
 *   sum_{i=1}^n → Σ<sub>i=1</sub><sup>n</sup>
 * For complex nested cases we use a simple regex chain.
 */

const GOLD = '#d4a843';

/* ── Universal Math Formatter ── */
export function formatMathHtml(str) {
  if (!str) return '';
  return str
    // Preserve already-tagged HTML spans or tags
    // w_rel, w_trust, w_ctx, w_beh, w_j, w_k, w_1
    .replace(/\bw_([a-zA-Z0-9]+)\b/g, '<em>w</em><sub>$1</sub>')
    // S_rel, S_trust, S_ctx, S_beh, S_K
    .replace(/\bS_([a-zA-Z0-9]+)\b/g, '<em>S</em><sub>$1</sub>')
    // E_follow, E_int, E_src, E_tgt
    .replace(/\bE_([a-zA-Z0-9]+)\b/g, '<em>E</em><sub>$1</sub>')
    // x'_jc, x_u, x_i, x_ij, x_kj
    .replace(/\bx'_([a-zA-Z0-9]+)\b/g, '<em>x′</em><sub>$1</sub>')
    .replace(/\bx_([a-zA-Z0-9]+)\b/g, '<em>x</em><sub>$1</sub>')
    .replace(/\bX'_([a-zA-Z0-9]+)\b/g, '<em>X′</em><sub>$1</sub>')
    .replace(/\bX_([a-zA-Z0-9]+)\b/g, '<em>X</em><sub>$1</sub>')
    // P_j, P_k
    .replace(/\bP_([a-zA-Z0-9]+)\b/g, '<em>P</em><sub>$1</sub>')
    // F_in, F_out
    .replace(/\bF_([a-zA-Z0-9]+)\b/g, '<em>F</em><sub>$1</sub>')
    // H_u, H_c
    .replace(/\bH_([a-zA-Z0-9]+)\b/g, '<em>H</em><sub>$1</sub>')
    // A_ij, A_uv, k_i, k_j, c_i, c_j, b_in
    .replace(/\bA_([a-zA-Z0-9]+)\b/g, '<em>A</em><sub>$1</sub>')
    .replace(/\bk_([a-zA-Z0-9]+)\b/g, '<em>k</em><sub>$1</sub>')
    .replace(/\bc_([a-zA-Z0-9]+)\b/g, '<em>c</em><sub>$1</sub>')
    .replace(/\bb_([a-zA-Z0-9]+)\b/g, '<em>b</em><sub>$1</sub>')
    // Greek subscripts: α_ℓ, β_1, λ_div
    .replace(/(α|&alpha;|β|&beta;|λ|&lambda;)_([a-zA-Z0-9ℓ]+)/g, '$1<sub>$2</sub>')
    // d_E
    .replace(/\bd_E\b/g, '<em>d</em><sub>E</sub>')
    // LaTeX $K=10$ or Top-$K$
    .replace(/\$([^\$]+)\$/g, '<em>$1</em>')
    // P_bar_j or P̄_j
    .replace(/P_bar_([a-zA-Z0-9]+)/g, '<span style="text-decoration:overline;font-style:italic">P</span><sub>$1</sub>')
    // Score(u, c)
    .replace(/Score\(([^)]+)\)/g, '<em>Score</em>($1)')
    // T(c)
    .replace(/\bT\(([a-zA-Z0-9]+)\)/g, '<em>T</em>($1)')
    // multiplication * to &middot;
    .replace(/(\w|\>|\))(\s*)\*(\s*)(\w|\<|\()/g, '$1 &middot; $4')
    // sum( -> ∑(
    .replace(/\bsum\(/g, '&sum;(');
}

export function MathText({ text, className, style, tag: Tag = 'span' }) {
  if (!text) return null;
  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: formatMathHtml(text) }}
    />
  );
}

/* ── Inline math spans rendered from safe HTML strings ── */
export function M({ children }) {
  return (
    <span
      style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
      dangerouslySetInnerHTML={{ __html: children }}
    />
  );
}

/* ── A single numbered formula row ── */
export function FormulaRow({ step, name, expr, desc, color = GOLD }) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start',
      padding: '0.85rem 1rem',
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid rgba(212,168,67,0.15)',
      borderRadius: '8px',
      marginBottom: '0.6rem',
    }}>
      {step && (
        <span style={{
          background: 'rgba(212,168,67,0.12)',
          border: `1px solid rgba(212,168,67,0.3)`,
          color: GOLD,
          borderRadius: '4px',
          width: 26, height: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.78rem',
          flexShrink: 0, fontFamily: 'monospace',
        }}>{step}</span>
      )}
      <div style={{ flex: 1 }}>
        {name && <div style={{ fontWeight: 700, fontSize: '0.78rem', color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>{name}</div>}
        <div style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '0.95rem',
          color: '#e2e8f0',
          lineHeight: '1.55',
          letterSpacing: '0.01em',
        }}
          dangerouslySetInnerHTML={{ __html: expr }}
        />
        {desc && (
          <div
            style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#71717a', fontStyle: 'italic' }}
            dangerouslySetInnerHTML={{ __html: formatMathHtml(desc) }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Formula block wrapper ── */
export function FormulaBlock({ title, children, accent = GOLD }) {
  return (
    <div style={{
      background: 'rgba(10,10,13,0.7)',
      border: `1px solid rgba(212,168,67,0.25)`,
      borderRadius: '10px',
      padding: '1.25rem 1.35rem',
      marginBottom: '1.25rem',
    }}>
      {title && (
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(212,168,67,0.12)' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRE-BUILT FORMULA SETS used across the site
   ───────────────────────────────────────────────────────────── */

/** Layer 2 — Louvain Modularity */
export function ModularityFormula() {
  return (
    <FormulaBlock title="Community Modularity (Louvain)">
      <FormulaRow
        expr={`Q = <span style="font-family:monospace;font-style:normal">1/2m</span> &middot; &sum;<sub>ij</sub> [ A<sub>ij</sub> &minus; (k<sub>i</sub> &middot; k<sub>j</sub> / 2m) ] &middot; &delta;(c<sub>i</sub>, c<sub>j</sub>)`}
        desc="m = total edges; A = adjacency; k = degree; δ = Kronecker delta for same community"
      />
    </FormulaBlock>
  );
}

/** Layer 4 — MCDM Pipeline (5 steps) */
export function MCDMFormulas() {
  return (
    <FormulaBlock title="Sun, Li &amp; Deng (2020) — Probability Distribution Negation MCDM">
      <FormulaRow step="1" name="Probability Distribution"
        expr={`P<sub>j</sub>(x<sub>i</sub>) = X&prime;<sub>ij</sub> / &sum;<sub>k=1</sub><sup>n</sup> X&prime;<sub>kj</sub>`}
        desc="Normalise each criterion column into a probability distribution over all complete users."
      />
      <FormulaRow step="2" name="Negation Distribution"
        expr={`<span style="text-decoration:overline;font-style:italic">P</span><sub>j</sub>(x<sub>i</sub>) = (1 &minus; P<sub>j</sub>(x<sub>i</sub>)) / (n &minus; 1)`}
        desc="Complementary distribution via Deng entropy principle (maintains Σ = 1)."
      />
      <FormulaRow step="3" name="Euclidean Distance"
        expr={`d<sub>E</sub>(P<sub>j</sub>, <span style="text-decoration:overline;font-style:italic">P</span><sub>j</sub>) = &radic;( &sum;<sub>i=1</sub><sup>n</sup> (P<sub>j</sub>(x<sub>i</sub>) &minus; <span style="text-decoration:overline;font-style:italic">P</span><sub>j</sub>(x<sub>i</sub>))<sup>2</sup> )`}
        desc="Distance between the distribution and its negation — larger distance → larger weight."
      />
      <FormulaRow step="4" name="Normalised Weight"
        expr={`w<sub>j</sub> = d<sub>E</sub>(P<sub>j</sub>, <span style="text-decoration:overline;font-style:italic">P</span><sub>j</sub>) / &sum;<sub>k=1</sub><sup>6</sup> d<sub>E</sub>(P<sub>k</sub>, <span style="text-decoration:overline;font-style:italic">P</span><sub>k</sub>)`}
        desc="Zero-distance criteria receive w_j = 0; remaining weights renormalised to sum exactly to 1."
      />
      <FormulaRow step="5" name="SAW Trust Score"
        expr={`T(c) = &sum;<sub>j=1</sub><sup>6</sup> w<sub>j</sub> &middot; X&prime;<sub>j</sub>(c)`}
        desc="Simple Additive Weighting: weighted sum of normalised feature values across all six criteria."
      />
    </FormulaBlock>
  );
}

/** Layer 5 — Composite Score */
export function CompositeScoreFormula() {
  return (
    <FormulaBlock title="Layer 5 — Composite Linear Score">
      <FormulaRow
        expr={`Score(u, c) = w<sub>rel</sub>&middot;S<sub>rel</sub>(u,c) + w<sub>trust</sub>&middot;S<sub>trust</sub>(c) + w<sub>ctx</sub>&middot;S<sub>ctx</sub>(u,c) + w<sub>beh</sub>&middot;S<sub>beh</sub>(c)`}
        desc="Defaults: w_rel = 0.40, w_trust = 0.30, w_ctx = 0.15, w_beh = 0.15"
      />
    </FormulaBlock>
  );
}

/** Layer 5 — MMR Reranking */
export function MMRFormula() {
  return (
    <FormulaBlock title="Diversity-Aware Maximal Marginal Relevance (MMR)">
      <FormulaRow name="Selection at step t"
        expr={`c* = argmax<sub>c &isin; Pool &setminus; S</sub> [ (1&minus;&lambda;)&middot;Score(u,c) + &lambda;&middot;Novelty(c, S) ]`}
      />
      <FormulaRow name="Novelty function"
        expr={`Novelty(c, S) = 
          <span style="font-family:monospace;font-style:normal">{ 1.0</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if C(c) &notin; {C(s) | s &isin; S}<br/>
          <span style="font-family:monospace;font-style:normal">{ 1/(1+&sum;<sub>s&isin;S</sub>I[C(s)=C(c)])</span>&nbsp;&nbsp;otherwise<br/>
          &nbsp;&nbsp;+ 0.10 &middot; I[C(c) &ne; C(u)]`}
        desc="C(x) = community of x; I[·] = indicator function; λ = diversity weight (default 0.30)"
      />
    </FormulaBlock>
  );
}

/** Layer 5 — LightGCN Directed Convolution */
export function LightGCNFormulas() {
  return (
    <FormulaBlock title="Directed LightGCN — Asymmetric Graph Convolution">
      <FormulaRow name="Symmetric Directed Normalisation"
        expr={`Â = D<sub>out</sub><sup>&minus;½</sup> A D<sub>in</sub><sup>&minus;½</sup>`}
        desc="Asymmetric normalisation for directed follow graph A (A_uv = 1 iff u → v)"
      />
      <FormulaRow name="Layer-wise Propagation (layer ℓ)"
        expr={`E<sub>src</sub><sup>(ℓ+1)</sup> = Â &middot; E<sub>tgt</sub><sup>(ℓ)</sup>&nbsp;&nbsp;&nbsp;[Aggregates target authority of followees]<br/>
               E<sub>tgt</sub><sup>(ℓ+1)</sup> = Â<sup>T</sup> &middot; E<sub>src</sub><sup>(ℓ)</sup>&nbsp;&nbsp;&nbsp;[Aggregates source interest of followers]`}
      />
      <FormulaRow name="Final Embedding &amp; Score"
        expr={`E<sub>src</sub>* = &sum;<sub>ℓ=0</sub><sup>L</sup> &alpha;<sub>ℓ</sub> &middot; E<sub>src</sub><sup>(ℓ)</sup>,&nbsp;&nbsp;&nbsp;
               E<sub>tgt</sub>* = &sum;<sub>ℓ=0</sub><sup>L</sup> &alpha;<sub>ℓ</sub> &middot; E<sub>tgt</sub><sup>(ℓ)</sup><br/>
               ŷ<sub>uv</sub> = &langle;E<sub>src</sub>*[u], E<sub>tgt</sub>*[v]&rangle; + b<sub>in</sub>[v]`}
        desc="α_ℓ = layer combination weight; b_in = learned popularity bias for in-degree"
      />
    </FormulaBlock>
  );
}
