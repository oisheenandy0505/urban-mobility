# Can Cities Survive Traffic Shocks? 
## Urban Mobility Network Resilience Modeling

## Overview
Graph-based analysis of road network resilience across 6 U.S. 
cities — quantifying connectivity loss and travel-time inflation 
under infrastructure failure conditions using network science 
and machine learning.

**Cities studied:** Boston, Chicago, Dallas, Phoenix, 
Pittsburgh, San Francisco

---

## Research Question
If part of a city's road network fails — which cities continue 
to function, and which collapse into gridlock?

---

## Methodology

### Data
- Road networks built from **OpenStreetMap** via OSMnx
- Directed weighted graphs: nodes = intersections, 
  edges = road segments with travel-time weights

### Failure Scenarios (5 types)
- Bridge collapse
- Tunnel closure  
- Highway flooding
- Targeted attack on high-betweenness edges
- Random failure

Severity levels: 5%, 10%, 20%, 30% of edges removed

### Resilience Metric
Composite score balancing:
- Travel-time inflation (post-failure vs baseline)
- Fraction of disconnected origin-destination pairs

---

## Machine Learning Model
- **Model:** Random Forest Regressor
- **Dataset:** 100 simulation runs across 5 cities, 
  5 scenarios, 4 severity levels
- **Performance:** R² ≈ 0.96, MAE ≈ 0.03
- **Features:** Degree assortativity, clustering coefficient, 
  modularity, betweenness centrality, avg shortest path length

---

## Key Findings

**1. Targeted attacks are most destructive**
High-betweenness edge attacks cause the sharpest resilience 
drop — even at moderate severity levels.

**2. Grid cities are more resilient**
Chicago and San Francisco (higher assortativity) consistently 
outperform Phoenix and Boston under all failure scenarios.

**3. Degree assortativity predicts resilience**
Cities where well-connected intersections link to other 
well-connected nodes maintain better alternative routing 
paths under disruption.

**4. Vulnerability clusters spatially**
Vulnerable hubs concentrate along downtown cores, river 
crossings, and major arterial corridors — not uniformly 
distributed. A small number of critical nodes drive 
disproportionate system-wide collapse.

**5. Connectivity collapse is nonlinear**
At 20%+ severity, several cities experience abrupt 
reachability loss — suggesting a fragmentation threshold.

---

## Structural Network Metrics

| City | Assortativity | Modularity | Communities | Mean Resilience |
|------|--------------|------------|-------------|-----------------|
| Boston | 0.127 | 0.947 | 46 | Low |
| Chicago | 0.198 | 0.953 | 58 | High |
| Dallas | 0.177 | 0.961 | 70 | Medium |
| Phoenix | 0.094 | 0.970 | 104 | Low |
| Pittsburgh | 0.102 | 0.949 | 52 | Medium |
| San Francisco | 0.216 | 0.925 | 39 | High |

---

## Policy Implications
- Uniform reinforcement strategies miss disproportionate 
  impact of a small number of critical hubs
- Selective hardening at spatially clustered vulnerable 
  nodes yields greater resilience gains
- Network-aware vulnerability mapping complements 
  conventional traffic volume analysis

---

## Tech Stack

```
Python | OSMnx | NetworkX | Random Forest |
Scikit-learn | Jupyter Notebook | OpenStreetMap
```
---

## Repository Structure

```

├── backend/          # ML models and simulation engine
├── data/             # City road network datasets
├── frontend/         # Visualization code
├── graphs/           # Generated city graph outputs
└── README.md

```

---

## Contributors
- Charitha Battini — University of Pittsburgh
- Oishee Nandy — University of Pittsburgh  
- Surabhi Raghavan — University of Pittsburgh

*Network Science and Analysis | University of Pittsburgh*