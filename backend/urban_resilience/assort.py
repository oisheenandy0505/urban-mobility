import osmnx as ox
import networkx as nx

city = "Pittsburgh, Pennsylvania, USA"
G = ox.graph_from_place(city, network_type="drive")

#G_simplified = ox.simplify_graph(G)

assort = nx.degree_assortativity_coefficient(G)
print(city, assort)
