import morgan from "morgan";
import chalk from "chalk";
import fs, { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { Response } from "express";
import { IncomingMessage, ServerResponse } from "http";

const env = process.env.NODE_ENV || "development";
const logFileName = `${env.trim()}.request.log`;
const logFilePath = path.resolve(
  process.cwd(),
  env === "development" ? "src" : "dist/src",
  "logging",
  "logs",
  "requests",
  logFileName
);

if (!existsSync(logFilePath)) {
  // First ensure the directory structure exists
  const logDir = path.dirname(logFilePath);

  if (!existsSync(logDir)) {
    // Create the directory structure recursively
    mkdirSync(logDir, { recursive: true });
  }

  // Create the empty log file
  writeFileSync(logFilePath, "", "utf8");

  console.log(`Log file created at: ${logFilePath}`);
}

// Log stream for file logging
const networkRequestLogStream = fs.createWriteStream(logFilePath, {
  flags: "a",
});

// Utility function to determine method color
const getMethodColor = (method: string) => {
  const colors: Record<string, "green" | "yellow" | "cyan" | "red"> = {
    GET: "green",
    POST: "yellow",
    PUT: "cyan",
    DELETE: "red",
  };
  return chalk[colors[method] || "white"](method);
};

// Utility function to determine status color
const getStatusColor = (status: number) => {
  const colors: Record<number, "red" | "yellow" | "cyan" | "green" | "white"> =
    {
      500: "red",
      400: "yellow",
      300: "cyan",
      200: "green",
      0: "white",
    };
  const colorKey =
    Object.keys(colors)
      .reverse()
      .find((key) => status >= Number(key)) || 0;
  return chalk[colors[Number(colorKey)]](status);
};

// Log format function (shared logic)
const logFormat = (
  tokens: any,
  req: IncomingMessage,
  res: ServerResponse,
  useColors = false
) => {
  const method = tokens.method(req, res);
  const status = tokens.status(req, res);

  return [
    `[${tokens["date"](req, res, "web")}]`,
    `${tokens["remote-addr"](req, res)} - ${
      useColors ? getMethodColor(method) : method
    }`,
    tokens.url(req, res),
    `HTTP/${tokens["http-version"](req, res)}`,
    useColors ? getStatusColor(Number(status)) : status,
    tokens.res(req, res, "content-length"),
    "-",
    tokens["response-time"](req, res),
    "ms",
  ].join(" ");
};

// Logger for writing to a file (no colors)
export const fileRequestLogger = () =>
  morgan((tokens, req, res) => logFormat(tokens, req, res), {
    stream: networkRequestLogStream,
  });

// Logger for console output (with colors)
export const consoleRequestLogger = () =>
  morgan((tokens, req, res) => logFormat(tokens, req, res, true), {
    stream: process.stdout,
  });
