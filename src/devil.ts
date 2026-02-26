import "dotenv/config";
import * as readline from "node:readline";
import Anthropic from "@anthropic-ai/sdk";
import { DEVIL_ADVOCATE_PROMPT } from "./prompts.js";
import { colors, banner, sectionHeader } from "./colors.js";

const client = new Anthropic();

async function devilsAdvocate(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log(banner("Devil's Advocate Mode", colors.magenta));
  console.log(
    "State your position on anything. I'll challenge every angle.\n"
  );
  console.log(`${colors.dim}Type "quit" to exit.${colors.reset}\n`);

  const messages: Anthropic.MessageParam[] = [];
  let isFirstMessage = true;

  while (true) {
    const prompt = isFirstMessage
      ? `${colors.green}${colors.bold}Your position: ${colors.reset}`
      : `${colors.green}${colors.bold}Your response: ${colors.reset}`;

    const userInput = await ask(prompt);

    if (userInput.toLowerCase() === "quit") {
      console.log("\nGood debate! Your position is stronger for it. 👊\n");
      rl.close();
      break;
    }

    if (!userInput.trim()) continue;

    messages.push({ role: "user", content: userInput });

    console.log(sectionHeader("😈", "Devil's Advocate", colors.magenta));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: DEVIL_ADVOCATE_PROMPT,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock?.type === "text" ? textBlock.text : "";

    console.log(reply + "\n");

    messages.push({ role: "assistant", content: reply });
    isFirstMessage = false;
  }
}

devilsAdvocate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
