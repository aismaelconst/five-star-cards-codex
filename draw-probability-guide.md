# Gold Draw Probability Guide

This guide helps you answer one practical question:

**"If I end turn now, what is my chance to draw at least one gold?"**

It is format-agnostic (Core, Gilded Gems, Ancient, Mystic) because the calculation depends on deck state, not expansion identity.

## What You Need

- `D` = deck cards remaining
- `G` = gold cards remaining in deck
- `n` = how many cards you will draw this end turn

In Five Star Cards, `n` comes from the cards you archive at end of turn:
- Bronze draws 1
- Silver draws 2
- Gold draws 3
- Most expansion cards draw 0

## Quick Formula (Reference Only)

Draws happen without replacement, so the exact chance is:

`P(at least 1 gold) = 1 - C(D-G, n) / C(D, n)`

If you do not want to calculate it during play, use the examples and heuristics below.

## Practical Examples (Common Draw Sizes 1-5)

Percent chance to draw **at least one gold**:

| Deck State | D | G | n=1 | n=2 | n=3 | n=4 | n=5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Early-style | 170 | 5 | 2.94% | 5.81% | 8.62% | 11.35% | 14.02% |
| Mid-style | 120 | 4 | 3.33% | 6.58% | 9.75% | 12.83% | 15.84% |
| Late-style | 60 | 3 | 5.00% | 9.83% | 14.49% | 18.99% | 23.33% |

Interpretation:
- Small draw turns (`n=1` or `n=2`) are low-probability for gold spikes.
- Moving from `n=2` to `n=4` is a meaningful jump.
- As the deck shrinks, each draw is more likely to hit gold.

## Tactical Use In-Game

When deciding whether to end turn now or keep building:

1. If your draw this turn is low, prioritize setup over forcing gold
- Prefer improving your next turns (trade chains, tutor lines, deck quality) instead of hoping for a low-probability gold hit.

2. Protect your bronze/silver draw engine
- Zero-draw end turns slow your probability pacing.
- In practice, keeping a stable draw engine gives more total "gold attempts" across the game.

3. Use thinning and tutoring to raise effective gold odds
- Removing low-impact clutter improves future draw quality.
- Any line that increases your next-turn `n` or improves deck composition usually beats low-odds fishing now.

4. Think in sequences, not single turns
- A 10-15% chance this turn can still be correct to skip if it unlocks a much better draw/tutor turn immediately after.

## Fast Mental Heuristic

- **Below ~8%**: usually do not chase gold immediately unless you have no better line.
- **~8% to ~15%**: context-dependent; compare against your setup value.
- **15%+**: often reasonable to take the shot if it does not damage your engine.

This is a planning guide, not a strict rule. Board state, trade availability, and win-race pressure still matter.

## Future UI Idea (Not Implemented)

Add a small optional hint near End Turn:

`Gold next draw: X%`

This would keep the game simple while giving players immediate probability feedback at decision time.
