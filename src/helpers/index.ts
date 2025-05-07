export * from "./send-response";
export * from "./throw-request-error";
export * from "./router-creator";

export function toBoolean(value: string) {
  return value === "true";
}
