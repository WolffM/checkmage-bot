# Contributing

A single-file Node.js bot with two small helpers. There is no build step
and no CI (the last workflow this repo ran, vibeCheck, was removed in
`58bad44`; see [history](history.md)).

## Layout

| Path | What it is |
| --- | --- |
| `bot.mjs` | the Discord client, the command dispatcher, every command's implementation |
| `groq.mjs` | the AI-persona system prompt and the Groq chat-completion call |
| `helper.mjs` | two small utilities: a delay and a Fisher-Yates shuffle |
| `package.json` | `discord.js`, `groq-sdk`, `dotenv`, `jimp` |

## Run it

```sh
npm install
node bot.mjs    # or: npm start
```

Needs `DISCORD_TOKEN` (and optionally `SILLYUSER`, `GROQ_API_KEY`) in a
`.env` file; `bot.mjs` logs an error and exits without a token.

## A known bug

`!triviastats` deletes the message that triggered it and then never
posts its result: `calculateTriviaStats` builds the stats string, logs it
with `console.log`, and has its `channel.send(statsMessage)` call
commented out (`bot.mjs:170`). The handler also still checks messages
against a literal placeholder trivia-bot ID (`'...'`) that was never
filled in. Typing `!triviastats` currently just deletes your own message
and produces no visible output.

## Security

A fully unused `discord` npm package (distinct from `discord.js`) sat in
`package.json` from the hero-drafting era until a security pass removed
it, on 2026-02-06, to close a MooTools ReDoS advisory it depended on,
GHSA-v63q-hgqc-qvpg.

## Trivia

Of the bot's four dependencies, only one has ever been flagged for a
security advisory — and it was dead code, never imported by anything
the bot ran (2026-02-06).
