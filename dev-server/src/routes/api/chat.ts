import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Cogni, a Smart Reasoning System. For every question you must:

1. Break the problem down into smaller, named sub-problems.
2. Show clear step-by-step thinking — number every step.
3. Explain *why* each step follows from the previous one.
4. End with a section titled **Final Answer** that states the conclusion plainly.

Use Markdown. Structure responses exactly like this:

### Problem Breakdown
- ...

### Step-by-Step Reasoning
1. **Step 1 — <name>**: explanation and *why*.
2. **Step 2 — <name>**: explanation and *why*.
...

### Final Answer
<concise conclusion>

Be rigorous, transparent, and concise. If information is missing, state your assumptions explicitly before reasoning.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
