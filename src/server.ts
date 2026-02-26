import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { proPrompt, againstPrompt, MODERATOR_PROMPT } from "./prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/debate", async (req: express.Request, res: express.Response) => {
  const topic = req.query.topic as string;
  const exchanges = parseInt(req.query.exchanges as string) || 4;

  if (!topic) {
    res.status(400).json({ error: "Topic is required" });
    return;
  }

  console.log(`\n🎬 New debate: "${topic}" (${exchanges} exchanges)`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  function send(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    res.write(payload);
  }

  // Confirm connection is live
  send("connected", { ok: true });

  try {
    const proMessages: Anthropic.MessageParam[] = [];
    const conMessages: Anthropic.MessageParam[] = [];
    const allMessages: Array<{ side: "pro" | "con"; text: string }> = [];

    send("status", { text: "🟢 For Agent is typing..." });
    console.log("  ⏳ Calling Claude for PRO opening...");

    const proOpen = await chat(
      proPrompt(topic),
      proMessages,
      "Make your opening statement. Keep it punchy — 2-3 sentences max. Be provocative."
    );
    allMessages.push({ side: "pro", text: proOpen });
    send("chat", { side: "pro", text: proOpen });
    console.log("  ✅ PRO opening done");

    for (let i = 0; i < exchanges; i++) {
      const lastPro =
        allMessages.filter((m) => m.side === "pro").at(-1)?.text ?? "";

      send("status", { text: "🔴 Against Agent is typing..." });
      console.log(`  ⏳ Calling Claude for CON reply ${i + 1}...`);

      const conReply = await chat(
        againstPrompt(topic),
        conMessages,
        i === 0
          ? `Your opponent just said:\n\n"${lastPro}"\n\nFire back with a sharp counter. 2-4 sentences, directly address what they said.`
          : `Your opponent responded:\n\n"${lastPro}"\n\nKeep arguing. Be direct, specific, and don't repeat yourself. 2-4 sentences.`
      );
      allMessages.push({ side: "con", text: conReply });
      send("chat", { side: "con", text: conReply });
      console.log(`  ✅ CON reply ${i + 1} done`);

      if (i < exchanges - 1) {
        send("status", { text: "🟢 For Agent is typing..." });
        console.log(`  ⏳ Calling Claude for PRO reply ${i + 1}...`);

        const proReply = await chat(
          proPrompt(topic),
          proMessages,
          `Your opponent responded:\n\n"${conReply}"\n\nKeep arguing. Be direct, specific, and don't repeat yourself. 2-4 sentences.`
        );
        allMessages.push({ side: "pro", text: proReply });
        send("chat", { side: "pro", text: proReply });
        console.log(`  ✅ PRO reply ${i + 1} done`);
      }
    }

    send("status", { text: "⚖️ Judge is deliberating..." });
    console.log("  ⏳ Calling Claude for verdict...");

    const transcript = allMessages
      .map((m) => `[${m.side === "pro" ? "FOR" : "AGAINST"}]: ${m.text}`)
      .join("\n\n");

    const verdictResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: MODERATOR_PROMPT,
      messages: [
        {
          role: "user",
          content: `TOPIC: "${topic}"\n\nFull debate transcript:\n\n${transcript}`,
        },
      ],
    });

    const verdictBlock = verdictResponse.content.find(
      (b) => b.type === "text"
    );
    const verdict = verdictBlock?.type === "text" ? verdictBlock.text : "";

    send("verdict", { text: verdict });
    send("done", {});
    console.log("  🏁 Debate complete!\n");
  } catch (err) {
    console.error("  ❌ Error:", err);
    send("error", {
      text: err instanceof Error ? err.message : String(err),
    });
  }

  res.end();
});

async function chat(
  systemPrompt: string,
  history: Anthropic.MessageParam[],
  userMessage: string
): Promise<string> {
  history.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: systemPrompt,
    messages: history,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const reply = textBlock?.type === "text" ? textBlock.text : "";

  history.push({ role: "assistant", content: reply });
  return reply;
}

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`\n⚖️  Debate Agent running at http://localhost:${PORT}\n`);
});
