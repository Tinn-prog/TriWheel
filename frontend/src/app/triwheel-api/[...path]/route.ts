import { NextRequest, NextResponse } from "next/server";

const backendApi =
  process.env.INTERNAL_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000/api";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const targetPath = pathSegments.join("/");
  const targetUrl = `${backendApi}/${targetPath}${request.nextUrl.search}`;

  const headers = new Headers();
  const allowedHeaders = new Set([
    "accept",
    "authorization",
    "content-type",
    "content-length",
  ]);

  request.headers.forEach((value, key) => {
    if (allowedHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Let fetch recalculate multipart boundaries and body length.
  headers.delete("content-length");

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
