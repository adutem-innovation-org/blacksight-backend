import "express-async-errors";
import "module-alias/register";
import { addAliases } from "module-alias";
import { resolve } from "path";
import compression from "compression";
import helmet from "helmet";

addAliases({
  "@": resolve(__dirname, "../src"),
});

import express, { Request } from "express";
import http from "http";
import cors from "cors";
import {
  errorHandler,
  methodChecker,
  fileRequestLogger,
  consoleRequestLogger,
  routeNotFound,
  rateLimiter,
} from "./middlewares";
import { config } from "./config";
import { logger } from "./logging";
import { establishDatabaseConnection } from "./connections";
import { initRedis } from "./utils";
import { appRouter } from "./routes";

// Initialize an express app
const app = express();

// Create node server
const server = http.createServer(app);

// Rate limiter
app.use(rateLimiter({ limit: 500, ttl: 15 * 60 * 1000 }));

// Security middleware
/* Not very useful since we are not sending SSR templates or serving our own static files */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// In your main app setup
app.use((req, res, next) => {
  // Check if it's an agent route
  if (req.path.startsWith("/api/v1/agent")) {
    // Apply permissive CORS for agent routes
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-api-key",
        "x-agent-id",
        "x-session-id",
      ],
    })(req, res, next);
  } else {
    // Apply restrictive CORS for other routes
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://192.168.137.1:5173",
        "http://localhost:5000",
        ...config.corsOrigins,
      ],
      credentials: true,
    })(req, res, next);
  }
});

// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://localhost:5174",
//       "http://192.168.137.1:5173",
//       "http://localhost:5000",
//       ...config.corsOrigins,
//     ],
//     credentials: true,
//   })
// );

// Moderate compression setup
app.use(
  compression({
    threshold: 4096, // 4kb
    level: 6,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        // Bypass compression for specific client request
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

app.set("trust proxy", 1);

app.use(fileRequestLogger());
app.use(consoleRequestLogger());
app.use(methodChecker); // Checks if the incoming request method is supported
app.use(express.urlencoded({ extended: true })); // Parse urlencoded data in request body
app.use(express.json({})); // Parse json data in request body

app.use("/api/v1/", appRouter);
app.get(/^\/(api\/v1)?(\/)?$/, (req: Request, res: any) => {
  return res.send({
    success: true,
    message: "Hello! Blacksight backend active!👋",
  });
});

// All route that are not handled from the top will be handled here
app.all("*", routeNotFound); // Returns a 404 response for such routes
app.use(errorHandler as any); // Handles all error in the app

server.on("error", (error: any) => {
  if (error.code === "EADDRINUSE") {
    logger.error(
      `Port ${config.port} is already in use. Trying a different port...`
    );
    const NEW_PORT = config.port + 1;
    server.listen(NEW_PORT, config.hostname || "", () => {
      logger.info(`
          ------------
          Server Application Started!
          API V1: http://${config.hostname}:${NEW_PORT}
          API Docs: http://${config.hostname}:${NEW_PORT}/docs
          ------------
      `);
    });
  } else {
    logger.error(`Server error: ${error}`);
  }
});

const startServer = () => {
  server.listen(config.port, config.hostname, () => {
    logger.info(`
      ------------
      Server Application Started!
      API V1: http://${config.hostname}:${config.port}
      API Docs: http://${config.hostname}:${config.port}/docs
      ------------  
  `);
  });
};

const startApp = () => {
  initRedis();
  establishDatabaseConnection(startServer);
};

startApp();
