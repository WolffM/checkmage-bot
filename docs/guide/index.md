# Checkmage

Checkmage began in March 2024 as a Discord bot for a tabletop group's
server: a weekly-session announcer, then a full hero-drafting minigame
with combat art for fifteen heroes. The drafting game was deleted three months later in favor of something
smaller: an AI wizard persona (`groq.mjs`, via Groq's API) that replies in
character when mentioned. Alongside it sit a handful of utility commands: a
dice roller, the session announcer, a trivia-stats tally, and a running joke
that mirrors one user's punctuation.

A command and its reply (`!roll`, `bot.mjs`'s `calculateRollResult`):

```text
!roll 2d6+1d4
→ @Player rolled (3, 5, 2) Total: 10!
```

- [Features](features.md): what each command does.
- [Contributing](contributing.md): running it, its four dependencies, how it ships.
- [History](history.md): a hero-drafting game, built and then deleted.
- [Trivia](trivia.md)

## Trivia

The game that gave this bot its heavy lifting — fifteen heroes' worth of
combat art, a draft phase, starter picks and a type-matchup switch — was
cut in a single commit with no explanation at all, just "):"
([history](history.md#the-hero-draft-built-then-cut)).
