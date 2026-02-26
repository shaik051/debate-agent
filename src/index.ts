import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { proPrompt, againstPrompt, MODERATOR_PROMPT } from "./prompts.js";
import { colors, banner, sectionHeader } from "./colors.js";

const client = new Anthropic();

async function callAgent(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

interface DebateResult {
  topic: string;
  proOpening: string;
  conOpening: string;
  proRebuttal: string;
  conRebuttal: string;
  verdict: string;
}

async function debate(
  topic: string,
  rounds: number = 1
): Promise<DebateResult> {
  console.log(banner(`DEBATE: "${topic}"`, colors.cyan));

  // Round 1: Opening arguments (parallel)
  console.log(
    sectionHeader("⏳", "Round 1: Opening Arguments (thinking...)", colors.dim)
  );

  const [proOpening, conOpening] = await Promise.all([
    callAgent(
      proPrompt(topic),
      "Present your opening argument. Be compelling and specific."
    ),
    callAgent(
      againstPrompt(topic),
      "Present your opening argument. Be compelling and specific."
    ),
  ]);

  console.log(sectionHeader("🟢", "FOR", colors.green));
  console.log(proOpening);

  console.log(sectionHeader("🔴", "AGAINST", colors.red));
  console.log(conOpening);

  // Rebuttal rounds
  let lastProArg = proOpening;
  let lastConArg = conOpening;
  let proRebuttal = "";
  let conRebuttal = "";

  for (let round = 0; round < rounds; round++) {
    const roundNum = round + 2;
    console.log(
      sectionHeader(
        "⏳",
        `Round ${roundNum}: Rebuttals (thinking...)`,
        colors.dim
      )
    );

    [proRebuttal, conRebuttal] = await Promise.all([
      callAgent(
        proPrompt(topic),
        `Your opponent argued AGAINST your position with:\n\n${lastConArg}\n\nDeliver your rebuttal. Directly address their strongest points, then reinforce your position.`
      ),
      callAgent(
        againstPrompt(topic),
        `Your opponent argued FOR the position with:\n\n${lastProArg}\n\nDeliver your rebuttal. Directly address their strongest points, then reinforce your position.`
      ),
    ]);

    console.log(
      sectionHeader("🟢", `FOR — Rebuttal ${round + 1}`, colors.green)
    );
    console.log(proRebuttal);

    console.log(
      sectionHeader("🔴", `AGAINST — Rebuttal ${round + 1}`, colors.red)
    );
    console.log(conRebuttal);

    lastProArg = proRebuttal;
    lastConArg = conRebuttal;
  }

  // Verdict
  console.log(sectionHeader("⏳", "Judge deliberating...", colors.dim));

  const fullDebate = `
TOPIC: "${topic}"

== FOR — Opening ==
${proOpening}

== AGAINST — Opening ==
${conOpening}

== FOR — Rebuttal ==
${proRebuttal || "(no rebuttal round)"}

== AGAINST — Rebuttal ==
${conRebuttal || "(no rebuttal round)"}
`.trim();

  const verdict = await callAgent(MODERATOR_PROMPT, fullDebate);

  console.log(sectionHeader("⚖️", "VERDICT", colors.yellow));
  console.log(verdict);

  console.log(banner("Debate complete!", colors.cyan));

  return {
    topic,
    proOpening,
    conOpening,
    proRebuttal,
    conRebuttal,
    verdict,
  };
}

// Entry point
const args = process.argv.slice(2);
const roundsFlag = args.findIndex((a) => a === "--rounds");
let rounds = 1;
if (roundsFlag !== -1 && args[roundsFlag + 1]) {
  rounds = parseInt(args[roundsFlag + 1], 10);
  args.splice(roundsFlag, 2);
}

const topic = args.join(" ");

if (!topic) {
  console.log(`
${colors.cyan}${colors.bold}⚖️  Debate Agent${colors.reset} — Two AIs argue, you decide.

${colors.bold}Usage:${colors.reset}
  npx tsx src/index.ts "<topic>"
  npx tsx src/index.ts "<topic>" --rounds 2

${colors.bold}Examples:${colors.reset}
  npx tsx src/index.ts "pineapple belongs on pizza"
  npx tsx src/index.ts "remote work is better than office work"
  npx tsx src/index.ts "tabs are better than spaces" --rounds 2
  npx tsx src/index.ts "you should buy a house instead of renting"
  npx tsx src/index.ts "AI will replace most software engineers within 10 years"
`);
  process.exit(1);
}

debate(topic, rounds).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
