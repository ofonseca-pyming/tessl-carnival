# Whack-a-Mole

Whack the moles as they pop out of the nine holes, before they duck back down.

## How to play

- Moles pop up out of a 3 by 3 grid of holes and stay up for 1 second.
- Click a mole while it's up to whack it.
- A round lasts 30 seconds. Moles pop up once a second at the start, speeding
  up steadily to about three a second by the end.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole or missing costs
nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `popInterval`) and
  the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
