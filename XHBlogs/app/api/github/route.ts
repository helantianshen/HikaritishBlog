import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || "").trim();
  if (!clientSecret) {
    return NextResponse.json(
      { error: "GitHub OAuth 尚未配置" },
      { status: 503 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const rawBody = await request.text();
    let upstreamBody: string;
    let upstreamContentType: string;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      params.set("client_secret", clientSecret);
      upstreamBody = params.toString();
      upstreamContentType = "application/x-www-form-urlencoded";
    } else {
      const payload = JSON.parse(rawBody) as Record<string, unknown>;
      payload.client_secret = clientSecret;
      upstreamBody = JSON.stringify(payload);
      upstreamContentType = "application/json";
    }

    const githubResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": upstreamContentType,
          Accept: "application/json",
        },
        body: upstreamBody,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    const data = await githubResponse.json();
    return NextResponse.json(data, { status: githubResponse.status });
  } catch (error) {
    console.error(
      "[api/github] OAuth 代理失败",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ error: "OAuth 代理请求失败" }, { status: 502 });
  }
}
