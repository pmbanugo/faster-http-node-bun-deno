const server = Bun.serve({
  port: 6060,
  development: false,

  // Share the same port across multiple processes
  // This is the important part!
  reusePort: true,

  async fetch(request) {
    return new Response("Hello World", {
      headers: { "content-type": "text/plain" },
    });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
