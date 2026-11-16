# History

Checkmage started as a hero-drafting game, lost that game in a single
unexplained commit, and has spent most of its life since as a small,
stable utility bot.

## A Python scheduler, then a JS rewrite (2024-03-04 – 2024-03-09)

The first commit was a plain Python bot (`discord.py`) with exactly one
job: posting the next Thursday or Friday session's time (`5101067`). By
2024-03-09 it had been rewritten in JavaScript — `bot.js`/`saveData.js`
renamed to `.mjs` the same day (`6340ed5`).

## The hero draft, built then cut

Over the following three weeks the bot grew into a full hero-drafting
minigame: hero data and draft logic (`d647fe2`), a working draft phase
(`e3836c2`), starter selection (`bf1c771`), and a type-matchup "switch"
mechanic (`0420ab2`) — fifteen heroes in all, each with its own full-size
combat-art image. On 2024-06-06, an AI persona ("Checkmage lives,"
`2ff0e8e`) was added alongside it, built on Groq's chat-completion API.
Three days later, the entire drafting game was deleted in a commit whose
message is simply "):" — 21 files changed, 1,154 deletions against just
3 insertions: the hero data (169 lines), 985 lines of code across
`bot.mjs`, `helper.mjs` and `saveData.mjs`, and 17 image files (the
fifteen heroes' combat art plus two blank-state images) (`2011a63`).

## Small utilities (2024-08 – 2024-12)

What remained grew a handful of small commands instead: a `!fetch`
command pulling one field from a third-party hosted table (`d3b24a2`),
and, right before year's end, the "silly" punctuation mangler for one
configured user (`63efd37`, `47e8e04`).

## Dormant, then swept up in an account-wide pass (2025 – 2026)

The repo then sat untouched for about a year. A 2025-12-26 "Auto-commit"
(`8b089b5`) and a 2026-01-07 vibeCheck lint workflow (`acecee9`) mark the
start of routine, account-wide maintenance rather than new features: a
security fix for an unused dependency on 2026-02-06, and finally the
removal of vibeCheck itself ten months after it was added (`58bad44`).

## Trivia

The repo's very first commit, in Python, had no AI, no dice roller and
no drafting game at all — just a Thursday/Friday session announcer
(`5101067`), the one feature that has survived every rewrite since.
