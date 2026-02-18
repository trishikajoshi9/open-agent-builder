import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, HF_MODELS, type HFMessage } from "@/lib/huggingface";

const SYSTEM_PROMPT = `You are TriConnect AI, a powerful app builder assistant. You help users build web applications, mobile apps, and more.

Your capabilities:
- Generate code (React, Next.js, HTML, CSS, JavaScript, Python, etc.)
- Design UI components and layouts
- Explain technical concepts
- Debug code issues
- Suggest project architecture
- Generate images when asked (respond with [IMAGE: description] to trigger image generation)

Be concise, helpful, and provide working code examples. Use markdown formatting in your responses.
When writing code, always use proper syntax highlighting with \`\`\`language blocks.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model } = body as {
      messages: Array<{ role: string; content: string }>;
      model?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Build HF messages with system prompt
    const hfMessages: HFMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Optional HF API token from env (not required for free tier)
    const apiToken = process.env.HF_API_TOKEN;

    const response = await chatCompletion(hfMessages, {
      model: model || HF_MODELS.text,
      max_tokens: 2048,
      temperature: 0.7,
      apiToken,
    });

    return NextResponse.json({ response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Chat API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
