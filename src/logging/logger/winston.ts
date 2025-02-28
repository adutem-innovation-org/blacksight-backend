import { createLogger, format, transports } from "winston";
import chalk from "chalk";
import path from "path";

export enum LoggerLevels {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly",
}

const colorize = format.printf(({ level, message, timestamp }) => {
  const color =
    level === "error"
      ? "red"
      : level === "warn"
      ? "yellow"
      : level === "info"
      ? "green"
      : level === "debug"
      ? "cyan"
      : "white";
  return `${timestamp} ${chalk[color](level)}: ${chalk[color](message)}`;
});

const plainTextFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const env = process.env.NODE_ENV || "development";
const logFileName = `${env.trim()}.combined.log`;
const errorLogFileName = `${env.trim()}.error.log`;

export const logger = createLogger({
  level: "debug",
  format: format.combine(format.timestamp(), format.simple()),
  transports: [
    new transports.Console({
      format: format.combine(format.timestamp(), colorize),
    }),
    new transports.File({
      filename: path.resolve(
        process.cwd(),
        env === "development" ? "src" : "dist/src",
        "logging",
        "logs",
        "errors",
        errorLogFileName
      ),
      level: "error",
      format: format.combine(format.timestamp(), plainTextFormat),
    }),
    new transports.File({
      filename: path.resolve(
        process.cwd(),
        env === "development" ? "src" : "dist/src",
        "logging",
        "logs",
        "global",
        logFileName
      ),
      format: format.combine(format.timestamp(), plainTextFormat),
    }),
  ],
});
