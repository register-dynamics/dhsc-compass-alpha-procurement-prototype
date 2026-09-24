import type { NextFunction, Request, Response } from "express";
import type { HelmetOptions } from "helmet";

export const helmetConfig: HelmetOptions = {
  // Content Security Policy (CSP): Restrict the sources from which various types of content can be loaded to enhance security
  contentSecurityPolicy: {
    directives: {
      connectSrc: ["'self'"],
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "https://assets.nhs.uk"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  // Referrer Policy: Control the amount of referrer information sent with requests to enhance privacy and security
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
  // X-Frame-Options: Prevent the site from being framed to protect against clickjacking attacks
  xFrameOptions: { action: "deny" },
};

// Helmet.js does not include built-in support for the Permissions-Policy header, so we set it manually here.
export const permissionsPolicy = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), encrypted-media=(), interest-cohort=(), fullscreen=self, geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), speaker=(), sync-xhr=self, usb=(), vr=()",
  );
  next();
};
