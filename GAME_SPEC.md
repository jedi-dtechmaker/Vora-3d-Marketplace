# Game Architecture & System Specifications

## Core Technical Parameters
- **Chunk Size:** 100 units
- **Shading Strategy:** Flat material colors (no vertex colors for optimal runtime performance and fast builds with clean aesthetic)

---

# SECTION 17 — COIN PATH GENERATOR

## 17.1 Why this matters
Coins aren't decoration. They're **the tutor**. A good coin path teaches the player where to swing, when to release, and how to chain. Bad coin placement = coins floating in unreachable places = frustrating. Good coin placement = the player follows the coins and accidentally becomes good at the game.

## 17.2 Three placement strategies
The generator mixes these per chunk based on archetype density.

### Strategy A — Swing Arc
Placed along the natural arc of a swing from an anchor.
- Pick a `GrappleAnchor` (water tank, mast, awning end).
- Compute the forward swing arc the player would take if they attached and released at peak.
- Place coins along that arc — 5 to 9 coins, spaced ~1.5 units apart.
- Value: bronze (1) at the ends, silver (5) at the peak.
- **Teaches:** where to swing from, when to release.

### Strategy B — Altitude Line
Placed in a rising line that rewards height.
- Spawn above the roofline, rising forward.
- Player must chain two swings to reach it.
- 4 to 6 coins, mostly silver, one gold at the top.
- **Teaches:** swing higher, chain swings.

### Strategy C — Ground Skim
Low-risk, low-reward coins near the ground.
- Placed just above the ground on straightaways.
- 8 to 12 bronze coins in a line.
- Easy to grab while running.
- **Teaches:** the base movement, feels good for beginners.

## 17.3 Difficulty curve
Coin placement difficulty scales with run distance.

| Distance | Mix |
|---|---|
| 0–500m | 70% Ground Skim, 25% Swing Arc, 5% Altitude Line |
| 500–1500m | 30% Ground Skim, 50% Swing Arc, 20% Altitude Line |
| 1500m+ | 10% Ground Skim, 45% Swing Arc, 45% Altitude Line |

## 17.4 Anchor-aware placement
Before placing any coin, the generator queries the spatial hash for anchors within the chunk. If a chunk has fewer than 3 anchors, it falls back to Ground Skim. If it has 8+, it heavily favors Altitude Line.

This means **dense market rows** and **commercial blocks** naturally produce more aerial coin runs, while **warehouse stretches** produce ground runs. The city teaches the game.

## 17.5 Anti-patterns (do NOT do)
- No coins inside buildings.
- No coins below the kill plane.
- No coins within 1 unit of a lethal obstacle.
- No single floating coins with no neighbors — always clusters or lines.
- No coins in a straight vertical line (unnatural, hard to collect).
- No coins beyond max reachable rope length from the nearest anchor.

## 17.6 Code structure
```ts
// coinGenerator.ts
export function generateCoinPath(
  rng: Rng,
  chunkIndex: number,
  anchors: GrappleAnchor[],
  distance: number
): CoinInstance[] {
  const coins: CoinInstance[] = [];
  const mix = pickMix(distance);           // Strategy A/B/C weights
  const strategy = rng.weighted(mix);

  switch (strategy) {
    case 'groundSkim':
      coins.push(...groundSkim(rng, chunkIndex));
      break;
    case 'swingArc':
      coins.push(...swingArc(rng, chunkIndex, anchors));
      break;
    case 'altitudeLine':
      coins.push(...altitudeLine(rng, chunkIndex, anchors));
      break;
  }
  return coins;
}

function swingArc(
  rng: Rng,
  chunkIndex: number,
  anchors: GrappleAnchor[]
): CoinInstance[] {
  if (anchors.length === 0) return groundSkim(rng, chunkIndex);
  const anchor = rng.pick(anchors);
  const coins: CoinInstance[] = [];

  // Approximate arc: player attaches at anchor, swings forward-down
  const swingRadius = 18;                  // matches default rope length
  const arcStart = -Math.PI * 0.15;
  const arcEnd = Math.PI * 0.45;
  const count = rng.int(5, 9);

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = arcStart + t * (arcEnd - arcStart);
    const pos: [number, number, number] = [
      anchor.position[0] + Math.sin(angle) * swingRadius,
      anchor.position[1] - Math.cos(angle) * swingRadius,
      anchor.position[2] + t * 6,           // forward drift
    ];
    coins.push({
      position: pos,
      value: t > 0.3 && t < 0.7 ? 5 : 1,    // silver at the peak
    });
  }
  return coins;
}
```

## 17.7 Performance
- All coins in a chunk are a single **instanced mesh**.
- Value is stored per-instance in an `InstancedBufferAttribute`.
- Collect check: squared distance to player (no `Math.sqrt`).
- Pool coins. Never allocate during a run.

---

# SECTION 18 — HAZARD GENERATOR

## 18.1 Philosophy
Hazards should be **readable, dodgeable, and fair**. The player must see a hazard at least 0.5 seconds before it can kill them. No invisible walls. No gotcha spawns. Adrenaline comes from *just* dodging, not from being cheated.

## 18.2 Hazard types

### Ground hazards
| Hazard | Behavior | Counter |
|---|---|---|
| **Keke napep** | Drives slowly forward in a lane. Collidable. | Swing over. |
| **Okada rider** | Faster than keke, swerves between lanes. | Swing over, or dash. |
| **Market cart** | Static, blocks a lane. | Swing over. |
| **Pothole** | Static, slows you if you touch it. Not lethal. | Jump or swing over. |

### Air hazards
| Hazard | Behavior | Counter |
|---|---|---|
| **Drone** | Hovers, drifts slowly left-right. Lethal on contact. | Dodge or destroy (Ada's dash / Emeka's slam). |
| **Hanging wire** | Static line strung between two buildings. Slows you if touched. Not lethal. | Dodge up or down. |
| **Delivery bike (flying)** | Fast, straight line across the play area. Lethal. | Dodge. |

### Fixed hazards
| Hazard | Behavior | Counter |
|---|---|---|
| **Billboard** | Static panel at mid-height. Lethal on high-speed contact. | Swing around. |
| **Power cable cluster** | Static tangle. Slows you, tangles the rope for 0.5s. | Dodge. |
| **Construction scaffold** | Static. Grappleable AND collidable. | Swing from it, don't hit it. |

## 18.3 Spawn rules

### Rule 1 — Never block all lanes
At any Z-position, at least one survivable path must exist. The generator checks this after placing hazards and removes any that would seal the corridor.

### Rule 2 — Telegraph timing
- Ground hazards: visible from at least 40 units away.
- Air hazards: visible from at least 30 units away.
- Fixed hazards: visible from at least 50 units away.
- No hazard spawns inside a chunk that's already on screen.

### Rule 3 — Density scales with distance
| Distance | Ground hazards / 100m | Air hazards / 100m |
|---|---|---|
| 0–500m | 1 | 0 |
| 500–1500m | 2 | 1 |
| 1500–3000m | 3 | 2 |
| 3000m+ | 4 | 3 |

### Rule 4 — Pairing
Sometimes hazards pair to force a choice:
- Keke + drone above it = must swing over the keke, but duck the drone.
- Two drones spaced apart = must time the dash.
- Billboard + ground cart = must swing around the billboard, not over.
Pairing rate: 20% of hazards in a chunk.

### Rule 5 — Reward for risk
Every paired or tight hazard cluster gets **bonus coins** placed just past it. The reward for threading the needle.

## 18.4 Fairness checks
Before finalizing a chunk, the generator runs these checks:
1. **Corridor check** — simulate the player at base speed for the chunk's length. Verify at least one viable path exists without requiring a perfect swing.
2. **Reaction check** — verify every lethal hazard is visible ≥0.5s before contact at base speed.
3. **Anchor check** — verify every hazard cluster has at least one grapple anchor within rope range, so the player has a way out.
4. **Coin-hazard check** — verify no coin is placed such that collecting it forces a collision.

If any check fails, regenerate the hazard set for that chunk (max 3 attempts, then fall back to a sparse layout).

## 18.5 Code structure
```ts
// hazardGenerator.ts
export function generateHazards(
  rng: Rng,
  chunkIndex: number,
  distance: number,
  anchors: GrappleAnchor[]
): HazardInstance[] {
  const density = getDensity(distance);
  const hazards: HazardInstance[] = [];

  // Ground
  const groundCount = Math.round(density.ground * (CHUNK_LENGTH / 100));
  for (let i = 0; i < groundCount; i++) {
    hazards.push(spawnGroundHazard(rng, chunkIndex, i, groundCount));
  }

  // Air
  const airCount = Math.round(density.air * (CHUNK_LENGTH / 100));
  for (let i = 0; i < airCount; i++) {
    hazards.push(spawnAirHazard(rng, chunkIndex, i, airCount));
  }

  // Pairing
  if (rng.chance(0.2) && hazards.length >= 2) {
    pairHazards(rng, hazards);
  }

  // Fairness
  if (!passesFairnessChecks(hazards, anchors, distance)) {
    return fallbackSparse(rng, chunkIndex);
  }

  return hazards;
}
```

## 18.6 Anti-patterns (do NOT do)
- No hazard spawns behind the player.
- No hazards that require a swing from an anchor that doesn't exist.
- No drones that home in on the player. They drift, not chase.
- No hazard density higher than the tables above. Frustration kills runs, and runs are the fun.
- No hazards during the first 300m. Let the player learn to swing.

## 18.7 Performance
- Ground hazards: instanced per type.
- Air hazards: instanced per type.
- Hazard collision: AABB, no mesh-accurate collision.
- Pool everything. Zero runtime allocation.

---

## Milestone Status: M4a — City kit + generators (6–7 days)
- Kit parts (walls, roofs, props, market stalls): 2 days
- 7 building archetypes: 1 day
- Chunk generator + streamer: 1.5 days
- Coin path generator (3 strategies + curve): 1 day
- Hazard generator (types, density, pairing, fairness checks): 1.5 days
- Grapple anchor spatial hash: 0.5 day
