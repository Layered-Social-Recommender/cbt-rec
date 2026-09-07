import os
import sqlite3
import pandas as pd
import networkx as nx
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_data(db_path):
    conn = sqlite3.connect(db_path)
    users_df = pd.read_sql_query("SELECT * FROM users", conn)
    rels_df = pd.read_sql_query("SELECT source_canonical, target_canonical, type FROM relationships", conn)
    ints_df = pd.read_sql_query("SELECT source_canonical, target_canonical, type FROM interactions", conn)
    conn.close()
    return users_df, rels_df, ints_df

def build_master_graph(users_df, rels_df, ints_df):
    logger.info("Building Master MultiDiGraph...")
    # Using MultiDiGraph to preserve complete heterogeneous network structure
    G_master = nx.MultiDiGraph()
    
    # Add nodes with attributes
    for _, row in users_df.iterrows():
        node_id = row['canonical_acct']
        attrs = row.to_dict()
        # Ensure is_stub is boolean for better downstream handling
        attrs['is_stub'] = bool(attrs.get('is_stub', False))
        G_master.add_node(node_id, **attrs)
        
    # Add declarative edges (follows)
    for _, row in rels_df.iterrows():
        G_master.add_edge(row['source_canonical'], row['target_canonical'], type=row['type'], weight=1)
        
    # Add behavioral edges (interactions)
    for _, row in ints_df.iterrows():
        G_master.add_edge(row['source_canonical'], row['target_canonical'], type=row['type'], weight=1)
        
    logger.info(f"Master Graph: {G_master.number_of_nodes()} nodes, {G_master.number_of_edges()} edges.")
    return G_master

def extract_follow_graph(G_master):
    logger.info("Deriving Follow Graph view...")
    # Follow graph is a simple DiGraph
    G_follow = nx.DiGraph()
    G_follow.add_nodes_from(G_master.nodes(data=True))
    
    for u, v, data in G_master.edges(data=True):
        if data.get('type') == 'follows':
            # In DiGraph, adding an existing edge just updates it, but we only have 1 follow anyway
            G_follow.add_edge(u, v, type='follows', weight=1)
            
    logger.info(f"Follow Graph: {G_follow.number_of_edges()} follow edges.")
    return G_follow

def extract_interaction_graph(G_master):
    logger.info("Deriving Interaction Graph view (aggregated weights)...")
    G_interaction = nx.DiGraph()
    G_interaction.add_nodes_from(G_master.nodes(data=True))
    
    # Aggregate weights for interactions
    for u, v, data in G_master.edges(data=True):
        edge_type = data.get('type')
        if edge_type in ['reply', 'mention', 'reblog']:
            if G_interaction.has_edge(u, v):
                G_interaction[u][v]['weight'] += 1
                G_interaction[u][v][edge_type] = G_interaction[u][v].get(edge_type, 0) + 1
            else:
                G_interaction.add_edge(u, v, weight=1)
                G_interaction[u][v][edge_type] = 1
                
    # Fill in 0s for missing types to keep schema clean
    for u, v, data in G_interaction.edges(data=True):
        for t in ['reply', 'mention', 'reblog']:
            if t not in data:
                G_interaction[u][v][t] = 0

    logger.info(f"Interaction Graph: {G_interaction.number_of_edges()} aggregated interaction edges.")
    return G_interaction

def calculate_metrics(G_follow, G_interaction):
    logger.info("Calculating semantic graph metrics...")
    
    metrics = {}
    for node in G_follow.nodes():
        metrics[node] = {
            'canonical_acct': node,
            'in_degree': 0,
            'out_degree': 0,
            'pagerank': 0.0,
            'clustering_coefficient': 0.0,
            'community_id': -1,
            'reply_weight_out': 0,
            'mention_weight_out': 0,
            'reblog_weight_out': 0,
            'total_interaction_weight_out': 0
        }
        
    # Follow Graph Metrics
    in_degrees = dict(G_follow.in_degree())
    out_degrees = dict(G_follow.out_degree())
    
    # PageRank (handles directed naturally)
    pr = nx.pagerank(G_follow, alpha=0.85)
    
    # Clustering (NetworkX calculates clustering for DiGraph by ignoring direction or using specific definitions)
    clustering = nx.clustering(G_follow)
    
    # Community Detection (Louvain)
    try:
        # networkx 3.0+ supports Louvain on DiGraphs (directed modularity)
        communities = nx.community.louvain_communities(G_follow, seed=42)
    except Exception as e:
        logger.warning(f"Louvain failed on DiGraph, falling back to undirected. Error: {e}")
        communities = nx.community.louvain_communities(G_follow.to_undirected(), seed=42)
        
    community_map = {}
    for comm_id, members in enumerate(communities):
        for member in members:
            community_map[member] = comm_id
            
    # Interaction Graph Metrics (Activity signals)
    for u, v, data in G_interaction.edges(data=True):
        metrics[u]['reply_weight_out'] += data.get('reply', 0)
        metrics[u]['mention_weight_out'] += data.get('mention', 0)
        metrics[u]['reblog_weight_out'] += data.get('reblog', 0)
        metrics[u]['total_interaction_weight_out'] += data.get('weight', 0)
        
    # Populate dictionary
    for node in G_follow.nodes():
        metrics[node]['in_degree'] = in_degrees.get(node, 0)
        metrics[node]['out_degree'] = out_degrees.get(node, 0)
        metrics[node]['pagerank'] = pr.get(node, 0.0)
        metrics[node]['clustering_coefficient'] = clustering.get(node, 0.0)
        metrics[node]['community_id'] = community_map.get(node, -1)
        
    metrics_df = pd.DataFrame.from_dict(metrics, orient='index')
    return metrics_df

def save_outputs(G_master, metrics_df, db_path):
    logger.info("Saving Layer 2 outputs...")
    
    # 1. Save Master GraphML
    graphml_path = db_path.replace('cbt_rec_dataset.db', 'cbt_rec_graph.graphml')
    
    # Clean boolean and None attributes for GraphML serialization
    G_export = G_master.copy()
    for n, data in G_export.nodes(data=True):
        for k, v in list(data.items()):
            if v is None:
                del data[k]
            elif isinstance(v, bool):
                data[k] = int(v) # Convert bool to int for GraphML compatibility
                
    nx.write_graphml(G_export, graphml_path)
    logger.info(f"Saved Master GraphML to {graphml_path}")
    
    # 2. Save Metrics to SQLite
    conn = sqlite3.connect(db_path)
    # Write to a new table, replacing if exists
    metrics_df.to_sql('graph_metrics', conn, if_exists='replace', index=False)
    conn.close()
    logger.info(f"Saved {len(metrics_df)} metric rows to graph_metrics table in SQLite.")

def run_layer2():
    base_dir = os.path.dirname(__file__)
    db_path = os.path.join(base_dir, '..', '..', 'data', 'processed', 'mastodon', 'cbt_rec_dataset.db')
    
    if not os.path.exists(db_path):
        logger.error(f"Dataset not found at {db_path}. Please run Layer 1 first.")
        return
        
    users_df, rels_df, ints_df = load_data(db_path)
    
    G_master = build_master_graph(users_df, rels_df, ints_df)
    
    G_follow = extract_follow_graph(G_master)
    G_interaction = extract_interaction_graph(G_master)
    
    metrics_df = calculate_metrics(G_follow, G_interaction)
    
    save_outputs(G_master, metrics_df, db_path)
    
    # Summary Statistics Output
    print("\n" + "="*50)
    print("LAYER 2 SOCIAL GRAPH VERIFICATION REPORT")
    print("="*50)
    print(f"Master MultiDiGraph:")
    print(f"  Nodes (Total Accounts): {G_master.number_of_nodes()}")
    print(f"  Edges (Total Ties):     {G_master.number_of_edges()}")
    
    stub_count = len([n for n, d in G_master.nodes(data=True) if d.get('is_stub')])
    print(f"  Stub Nodes:             {stub_count}")
    
    print(f"\nFollow Graph (DiGraph):")
    print(f"  Follow Edges:           {G_follow.number_of_edges()}")
    
    print(f"\nInteraction Graph (Aggregated DiGraph):")
    print(f"  Unique User Pairs:      {G_interaction.number_of_edges()}")
    print(f"  Total Replies:          {int(metrics_df['reply_weight_out'].sum())}")
    print(f"  Total Mentions:         {int(metrics_df['mention_weight_out'].sum())}")
    print(f"  Total Reblogs:          {int(metrics_df['reblog_weight_out'].sum())}")
    
    print(f"\nMetric Summary:")
    print(f"  Communities Detected:   {metrics_df['community_id'].nunique()}")
    print(f"  Max PageRank:           {metrics_df['pagerank'].max():.6f}")
    print(f"  Avg Clustering Coeff:   {metrics_df['clustering_coefficient'].mean():.4f}")
    print("="*50 + "\n")

if __name__ == "__main__":
    run_layer2()
