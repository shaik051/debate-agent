# Debate Agent

Two AI agents argue any topic. A judge delivers a verdict. You watch the chaos.

Built for the Notion Agent Hackathon (March 2026).

## How it works

You give it a topic — serious or silly — and three AI personas take over:

1. **For Agent** makes an opening statement
2. **Against Agent** fires back
3. They go back and forth for several exchanges
4. A **Judge** reads the full transcript and delivers a verdict with a confidence score

Each agent has its own conversation memory, so they build on their previous arguments and directly counter what the other said.

## Setup

```bash
git clone https://github.com/shaik051/debate-agent.git
cd debate-agent
npm install
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Web UI

```bash
npx tsx src/server.ts
```

Open http://localhost:3456 — pick a topic or type your own, choose number of exchanges, and watch the debate unfold in real-time.

### CLI mode

```bash
npx tsx src/index.ts "pineapple belongs on pizza"
npx tsx src/index.ts "AI will replace software engineers" --rounds 2
```

### Devil's Advocate mode (interactive)

You state a position, the agent argues against you in a back-and-forth conversation.

```bash
npx tsx src/devil.ts
```

## Example topics

- "pineapple belongs on pizza"
- "remote work is better than office work"
- "tabs are better than spaces"
- "AI will replace most software engineers within 10 years"
- "you should rent instead of buying a house"
- "cats are better pets than dogs"
- "social media does more harm than good"
- "JavaScript is the best programming language"

## Architecture

```
Browser (index.html)
    │
    │  EventSource (SSE)
    ▼
Express server (server.ts)
    │
    │  3 different system prompts
    │  2 separate conversation histories
    │  1 loop passing messages between them
    ▼
Claude API (claude-sonnet-4-20250514)
```

The "agents" are three different system prompts to the same Claude API:

| Agent | System Prompt | Memory |
|-------|--------------|--------|
| For Agent | "You passionately believe this is right" | Own conversation history |
| Against Agent | "You passionately believe this is wrong" | Own conversation history |
| Judge | "You're a fair moderator, pick a winner" | Sees full transcript once |

With 5 exchanges, the app makes ~11 API calls total: 1 opening + 5 against + 4 for + 1 verdict.

## Tech stack

- TypeScript + Node.js
- Express (web server)
- Anthropic SDK (Claude API)
- Server-Sent Events (real-time streaming to browser)
- Vanilla HTML/CSS/JS (no frontend framework)
