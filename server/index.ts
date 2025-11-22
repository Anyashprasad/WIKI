import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { WebSocketServer } from "./websocket-server";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = [
  "https://www.wikiscan.dev",
  "https://wikiscan.dev",
  "https://wiki-client-i978dzgi8-23051977-8870s-projects.vercel.app",
  "http://localhost:5173",
];

// Create express app
const app = express();

// --------------------------------------
// 1. CORS MUST BE FIRST
// --------------------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// --------------------------------------
// 2. RAILWAY CORS PATCH
// --------------------------------------
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// --------------------------------------
// 3. EXPRESS BODIES
// --------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --------------------------------------
// 4. REGISTER ROUTES ON EXPRESS APP
// --------------------------------------
(async () => {
  // returns: http.Server
  const server = await registerRoutes(app);

  // Websockets
  const wsServer = new WebSocketServer(server);
  (global as any).wsServer = wsServer;

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "../../client/dist");
    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start server
  const port = Number(process.env.PORT || 5000);
  server.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`Server running on port ${port}`);
  });

})();
