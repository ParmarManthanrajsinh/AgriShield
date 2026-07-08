import { NextRequest } from "next/server";

const BACKEND_URL = process.env.API_BACKEND_URL || "http://localhost:8000";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  const pathname = path.join("/");
  const search = request.nextUrl.search;
  const targetUrl = new URL(pathname + search, BACKEND_URL);

  try {
    const headers = new Headers(request.headers);
    headers.delete("host"); // Let fetch set the correct host for the backend
    headers.delete("referer");

    const requestInit: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      requestInit.body = await request.arrayBuffer();
    }

    const backendResponse = await fetch(targetUrl, requestInit);
    
    // Node.js fetch automatically decompresses responses, but leaves the original headers.
    // If we forward 'content-encoding: gzip' to the browser with the already-decompressed body,
    // the browser throws ERR_CONTENT_DECODING_FAILED.
    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
