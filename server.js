const { createServer } = require("https");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const hostname = "dev.local";
const port = parseInt(process.env.PORT || "3000", 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Load HTTPS certificates (Next.js generates these automatically in dev mode)
  const certDir = path.join(process.cwd(), ".next/server/app-paths-manifest.json").includes(".next")
    ? path.join(process.cwd(), ".next")
    : path.join(process.cwd());

  // In development, use Next.js auto-generated certs
  let httpsOptions;
  if (dev) {
    const certPath = path.join(process.cwd(), "certificates");
    try {
      httpsOptions = {
        key: fs.readFileSync(path.join(certPath, "localhost-key.pem")),
        cert: fs.readFileSync(path.join(certPath, "localhost.pem")),
      };
    } catch (error) {
      console.error("Failed to load HTTPS certificates. Running with HTTP instead.");
      console.error("Run `next dev --experimental-https` first to generate certificates.");
      process.exit(1);
    }
  }

  // Create HTTPS server
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize Socket.IO (dynamically import ES module)
  const { initializeSocketIO } = await import("./src/lib/websocket/server.ts");
  initializeSocketIO(server);

  // Start server
  server.listen(port, () => {
    console.log(`> Ready on https://${hostname}:${port}`);
    console.log(`> Socket.IO available at wss://${hostname}:${port}/api/socketio`);
  });
});
