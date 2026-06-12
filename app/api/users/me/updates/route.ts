import { getCurrentUser, permissionsEmitter } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { signal } = request;
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Send initial ping to confirm connection
    writer.write(encoder.encode(": ping\n\n"));

    // Event listener
    const listener = (event: { userId: number; type: string }) => {
      if (event.userId === currentUser.id) {
        try {
          writer.write(
            encoder.encode(`data: ${JSON.stringify({ type: event.type })}\n\n`)
          );
        } catch (err) {
          // Stream might be closed already
        }
      }
    };

    permissionsEmitter.on("change", listener);

    // Keep connection alive with periodic pings (every 30 seconds)
    const pingInterval = setInterval(() => {
      try {
        writer.write(encoder.encode(": ping\n\n"));
      } catch (err) {
        // Stream might be closed
      }
    }, 30000);

    // Cleanup on disconnect
    signal.addEventListener("abort", () => {
      clearInterval(pingInterval);
      permissionsEmitter.off("change", listener);
      try {
        writer.close();
      } catch (err) {
        // Stream already closed
      }
    });

    return new Response(responseStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("SSE Error:", error);
    return new Response("Server error", { status: 500 });
  }
}
