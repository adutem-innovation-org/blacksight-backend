import rateLimit from "express-rate-limit";

// Create a rate limiter
export function rateLimiter(options: { limit: number; ttl: number }) {
  return rateLimit({
    windowMs: options.ttl, // Time frame in milliseconds
    max: options.limit, // Max number of requests per IP
    message: "Too many requests, please try again later.",
  });
}
