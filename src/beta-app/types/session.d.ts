import "express-session";

declare module "express-session" {
  interface SessionData {
    messages?: string[];
  }
}
