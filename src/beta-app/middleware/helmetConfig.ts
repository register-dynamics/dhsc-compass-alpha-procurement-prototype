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
    // Based off https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy#directives
    // Allows fullscreen mode for the current origin - lets users full-screen content
    // Allows sync-xhr for the current origin - enables synchronous XMLHttpRequests
    "accelerometer=(), ambient-light-sensor=(), aria-notify=(), attribution-reporting=(), autoplay=(), bluetooth=(), browsing-topics=(), camera=(), captured-surface-control=(), ch-ua-high-entropy-values=(), compute-pressure=(), cross-origin-isolated=(), deferred-fetch=(), deferred-fetch-minimal=(), display-capture=(), encrypted-media=(), fullscreen=(self), gamepad=(), geolocation=(), gyroscope=(), hid=(), identity-credentials-get=(), idle-detection=(), language-detector=(), language-model=(), local-fonts=(), local-network=(), local-network-access=(), loopback-network=(), magnetometer=(), microphone=(), midi=(), on-device-speech-recognition=(), otp-credentials=(), payment=(), picture-in-picture=(), private-state-token-issuance=(), private-state-token-redemption=(), publickey-credentials-create=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), speaker-selection=(), storage-access=(), translator=(), summarizer=(), unload=(), usb=(), web-share=(), window-management=(), xr-spatial-tracking=(), sync-xhr=(self)",
  );
  next();
};
