import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/public-api";

export const runtime = "nodejs";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { message?: unknown };
    const message =
      typeof payload.message === "string" ? payload.message.trim() : "";
    if (!message || message.length > 2000) {
      return NextResponse.json(
        { error: "消息不能为空且不能超过 2000 字符" },
        { status: 400 },
      );
    }

    const settings = await getSiteSettings();
    const assistant = settings.assistant;
    if (!assistant.enabled) {
      return NextResponse.json({ error: "AI 助手未启用" }, { status: 404 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI 服务尚未配置" },
        { status: 503 },
      );
    }

    const modelId = assistant.modelId.trim();
    if (!modelId) {
      return NextResponse.json(
        { error: "AI 模型尚未配置" },
        { status: 503 },
      );
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: assistant.systemPrompt }],
        },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: {
          maxOutputTokens: assistant.maxOutputTokens,
          temperature: assistant.temperature,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error("[api/chat] Gemini 请求失败", response.status);
      return NextResponse.json(
        { error: "AI 服务暂时不可用" },
        { status: 502 },
      );
    }

    const data = (await response.json()) as GeminiResponse;
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) {
      return NextResponse.json(
        { error: "AI 服务未返回有效内容" },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply });
  } catch (error) {
    console.error(
      "[api/chat] 请求处理失败",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ error: "请求处理失败" }, { status: 500 });
  }
}

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({ enabled: settings.assistant.enabled });
}
