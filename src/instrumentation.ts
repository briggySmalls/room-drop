export async function register() {
  if (process.env.NODE_ENV === "test") {
    const { server } = await import("../tests/msw/server");
    server.listen({ onUnhandledRequest: "bypass" });
  }
}
