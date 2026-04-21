# Gungi as an AI/ML Research Project — Feasibility & Roadmap

Notes captured from a planning discussion. Intent: if Gungi moves from hobby
game to a portfolio / research vehicle, this is what it could become, at what
cost, and how to frame it for different audiences.

## The idea

Use the already-built Gungi engine + server to:
1. Run large-scale Monte Carlo simulations of games
2. Analyze rule variations and starting positions for balance/fairness
3. Build a game-playing agent (classical MCTS or learned)
4. Write it up as a blog post / repo (not a formal paper)

## Hiring-signal honest assessment

**AI/ML roles** — strong differentiator if shipped well. Custom ruleset means you
can't paste from a tutorial; you had to adapt algorithms. LLM-as-agent angle
(prompting Claude to play) is on-trend for 2026.

**Quant hedge funds (Jane Street, Jump, Citadel, HRT)** — conversation-starter,
not filter-passer. Elite quant filters on probability/stats/olympiad-math, not
portfolio projects. Useful at the "tell me about a project" moment in late-stage
interviews, especially if methodology is statistically rigorous.

**Career stage impact**:
| Stage | Impact |
|---|---|
| 0-3 years | Material (could 1.5-2x interview rate at quality-focused shops) |
| 4-8 years | Marginal unless project is unusually impressive |
| 10+ | Minimal; reputation + referrals dominate |

**Format**: ship a blog post + open-source repo. Not a formal paper — Gungi
analysis lacks novelty for top venues. A workshop paper is theoretically
possible but adds weeks of polish for marginal signal.

## Feasibility — solo dev with limited compute

Realistic targets ranked by effort:

| Target | Approach | Solo feasibility |
|---|---|---|
| Beats random | Alpha-beta + material eval | ✅ weekend |
| Beats casual humans | Alpha-beta + PST heuristics, or MCTS + rollouts | ✅ 1-2 weeks |
| Beats strong amateurs | MCTS + tiny policy/value NN | ✅ 1-2 months |
| Competitive with serious play | AlphaZero-style self-play | ⚠️ possible but $$$ |
| AlphaZero-level | Massive self-play | ❌ out of reach (AlphaZero burned 5000 TPU-days) |

Gungi's larger branching factor (~100-300 vs chess's ~35) and deeper state
(3-tier towers) make it harder than chess per step. BUT the bar for
"impressive" is lower because no strong Gungi engines exist.

## Approach: find good starting positions

Key insight: you don't need a strong agent to find good starting positions —
you need a **consistent one run at scale**.

Pipeline:
1. Define "good" measurable: fairness (winrate ≈ 50%), decisiveness (low draw
   rate), engagement (game length distribution), strategic richness (decision
   entropy proxy)
2. Generate candidate starting positions — constrain by point-symmetry, use
   templates with parameterized offsets to shrink search space from billions
   to thousands
3. Evaluate each candidate: N self-play games from that starting position,
   record winner + length
4. Optimize with local search / CEM over the best candidates
5. Report with 95% CI on win rates. N=1000 distinguishes 48% from 52% but not
   49% from 51%

Embarrassingly parallel — scales linearly with cores.

## Cost breakdown

### Engine port (Rust, Go, or optimized TS)

| Option | Effort | Speedup over TS |
|---|---|---|
| Rust port | 1-2 weeks (+ 1 week if new to Rust) | ~30-100x |
| Go port | ~5 days | ~20-30x |
| Optimized TS | ~3 days | ~5-10x |

Target: 100k+ games/second/core with optimized Rust.

### Simulation compute

**Local**: Mac with 8-12 cores → ~1M games/sec total. Million games in 1s,
billion in ~15 min. Plenty for balance studies.

**Cloud CPU** (if wanted): Hetzner CX42 = 8 cores / 16 GB RAM = **$10/mo**.
Overkill for this use case.

### Neural network training (if going AlphaZero-lite)

Don't use AWS/GCP/Azure on-demand — 2-5x more expensive than dedicated GPU
clouds. Use Colab Pro ($10/mo), Kaggle free (30 GPU hr/week), Lambda Labs
(~$1.50/hr A100), RunPod, or Modal.

| Goal | GPU hours | Cost |
|---|---|---|
| Prove it works (tiny net) | 10-30 | $15-100 |
| Plays above casual human | 100-300 | $150-500 |
| Competitive with own MCTS | 500-1000 | $500-2000 |
| Strong bot, publishable | 2000+ | $3000+ |

### Realistic solo budget

**MCTS + balance study route (recommended)**: $0-20 total. Rust port is free,
simulations fit on laptop, optional $10 VPS for background runs.

**MCTS + tiny NN route**: $20-300. Add Colab Pro and some modest GPU time.

**AlphaZero-lite**: $500+. Expensive and diminishing returns for a portfolio
project.

## Hardware concern: running this on a Mac

Short answer: modern Apple Silicon is designed for sustained heavy compute.
Won't damage meaningfully. Thermal throttling protects the chip.

Real considerations:
- **Battery wear** (laptops): running at 100% CPU plugged in at 100% battery
  accelerates battery degradation. macOS's Optimized Battery Charging helps.
- **Airflow**: hard flat surface, not bed/couch/bag.
- **Fan lifespan**: rated for thousands of hours; a few weeks is a rounding
  error.

For multi-day runs, renting a $10-20/mo VPS is cheaper than a new battery and
frees up the laptop for regular work.

## Clarification: "agent" — which kind?

The word is overloaded in 2026.

**Game-playing agent** (what the Gungi project would build): program that
takes board state → outputs a move. Classical tradition (Stockfish, AlphaZero).
Doesn't speak natural language.

**LLM agent** (what Claude Code is): LLM with tool-calling. Acts in the world
via text + tool calls. Modern usage of "agent."

Both are "AI agents" in a broad sense. Gungi project would build the classical
kind primarily; optionally add an LLM-as-player angle for 2026-trend relevance.

Comparing the two ("my MCTS bot vs. Claude playing Gungi") is actually
publishable territory in LLM-evaluation workshops — a third axis of signal if
the user wants to push further.

## Realistic roadmap — if someday going for this

1. **Rust port of engine** (1-2 weeks, free)
2. **Classical MCTS with heuristic rollouts** (3-5 days, free)
3. **Balance-study pipeline**: candidate positions, simulated at scale,
   statistically analyzed (1-2 weeks, free)
4. **Writeup with charts** (few days, free)
5. *(Optional)* Tiny NN policy/value, trained via self-play (weeks, $50-200)
6. *(Optional)* LLM agent as comparison baseline (days, ~$10 in API costs)

Total MVP: ~1 month focused work, $0-20 out of pocket. Produces a shippable
portfolio piece with real statistical analysis.

## What NOT to do

- Start without finishing. "Aspirational research project" is hiring-poison.
- Skip the rigor. An agent report without confidence intervals isn't serious.
- Oversell. Calling a blog post a "paper" when it's not peer-reviewed invites
  skepticism.
- Pay for AWS/GCP GPUs when Lambda/RunPod/Modal are cheaper.
- Build AlphaZero-lite as the first milestone. Prove the pipeline with
  classical MCTS first.
