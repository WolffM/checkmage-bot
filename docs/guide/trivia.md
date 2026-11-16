# Trivia

The best facts about Checkmage, each with its source.

- The bot's original game — fifteen heroes, each with its own full-size
  combat-art image, a draft phase, starter picks and a "switch" mechanic —
  was deleted in a single commit whose entire message is "):" (`2011a63`).
  That landed three days after the bot's AI persona first went live
  (`2ff0e8e`).
- A fully unused `discord` npm package, distinct from the `discord.js`
  the bot actually runs on, sat in `package.json` for almost two years
  before a security pass removed it on 2026-02-06 to close a MooTools
  ReDoS advisory, GHSA-v63q-hgqc-qvpg (`7bae4b2` added it).
- A repo-wide lint workflow, vibeCheck, lived here for exactly 304 days:
  added 2026-01-07 (`acecee9`), updated once six days later (`edc99b6`),
  then removed in a commit titled, in full, "ci: remove vibeCheck"
  (`58bad44`).
- The AI persona has always introduced itself as "Checkmage," but the
  code that holds its system prompt names the variable `bruenorPrompt`,
  with no commit anywhere named Bruenor (`groq.mjs`, `2ff0e8e`).
