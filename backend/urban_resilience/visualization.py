import io
import base64
import matplotlib.pyplot as plt
import networkx as nx
from typing import List, Tuple

EdgeId = Tuple[int, int, int]


def plot_network_with_removed_edges(G: nx.MultiDiGraph, removed_edges: List[EdgeId]) -> str:
    """
    Draws the road network and highlights removed edges in red.

    Returns:
        A Base64-encoded PNG string.
    """
    # Prepare figure
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.set_axis_off()

    # Draw full network in light gray
    nx.draw(
        G,
        pos={n: (G.nodes[n]["x"], G.nodes[n]["y"]) for n in G.nodes},
        node_size=0,
        edge_color="#C9C9C9",
        width=0.5,
        ax=ax,
    )

    # Highlight removed edges
    if removed_edges:
        nx.draw_networkx_edges(
            G,
            pos={n: (G.nodes[n]["x"], G.nodes[n]["y"]) for n in G.nodes},
            edgelist=removed_edges,
            edge_color="red",
            width=1.2,
            ax=ax,
        )

    # Convert to base64
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)

    return base64.b64encode(buf.read()).decode("utf-8")