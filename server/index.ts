import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { serveStatic } from "./static";
import { createServer } from "http";
import os from "os";
import path from "path";
import { promises as fs } from "fs";

const app = express();
const httpServer = createServer(app);

app.set("etag", false);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "25mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "25mb" }));

async function loadEnvFile() {
  const candidates = [".env", ".env.example"];
  for (const name of candidates) {
    const filePath = path.join(process.cwd(), name);
    let raw = "";
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!key) continue;
      if (process.env[key] !== undefined) continue;
      process.env[key] = value;
    }
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function getLanIpv4(): string | undefined {
  const nets = os.networkInterfaces();
  for (const key of Object.keys(nets)) {
    const entries = nets[key] ?? [];
    for (const info of entries) {
      if (info.family !== "IPv4") continue;
      if (info.internal) continue;
      return info.address;
    }
  }
  return undefined;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await loadEnvFile();
  await storage.seedDefaultData();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const wantsHostFlag = process.argv.includes("--host");
  const preferredHost =
    process.env.HOST ||
    (process.env.NODE_ENV === "production" || wantsHostFlag ? "0.0.0.0" : "127.0.0.1");

  const listenWithFallback = (host: string) => {
    httpServer.listen(port, host, () => {
      const localUrl = `http://localhost:${port}`;
      const lanIp = host === "0.0.0.0" ? getLanIpv4() : undefined;
      const lanUrl = lanIp ? `http://${lanIp}:${port}` : undefined;

      log(`serving on port ${port}`);
      log(`Local:   ${localUrl}`);
      if (lanUrl) {
        log(`Network: ${lanUrl}`);
      } else if (host === "127.0.0.1") {
        log(`Network: disabled (run with --host)`);
      } else {
        log(`Network: unavailable`);
      }
    });

    httpServer.once("error", (err: any) => {
      if (
        host === "0.0.0.0" &&
        (err?.code === "ENOTSUP" || err?.code === "EADDRNOTAVAIL")
      ) {
        listenWithFallback("127.0.0.1");
        return;
      }
      throw err;
    });
  };

  listenWithFallback(preferredHost);
})();
