import { APIError } from "better-auth/api";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { isPasswordlessAuth } from "./passwordless-config";
import { consumeAuthLimit } from "./throttle";

const route = createRoute({
  method: "post",
  path: "/magic-link/confirm",
  operationId: "confirmMagicLink",
  tags: ["Authentication"],
  summary: "Confirm an emailed sign-in link",
  description:
    "Explicitly redeem a single-use emailed link from the trusted web application. Sets the session cookie without exposing the session token in the response.",
  security: [],
  middleware: [bodyLimit({ maxSize: 4096 })],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ token: z.string().min(20).max(256) }),
        },
      },
    },
  },
  responses: {
    200: jsonResponse("Signed in", z.object({ success: z.literal(true) })),
    400: errorResponse("Invalid or expired link"),
    403: errorResponse("Untrusted origin or registration not allowed"),
    404: errorResponse("Passwordless authentication is not enabled"),
    413: errorResponse("Request too large"),
    429: errorResponse("Too many attempts"),
  },
});

export const magicLinkConfirmation = apiRouter().openapi(route, async (c) => {
  if (!isPasswordlessAuth()) throw new HTTPException(404);
  const origin = new URL(
    process.env.KANEO_CLIENT_URL || "http://localhost:5173",
  ).origin;
  if (c.req.header("origin") !== origin)
    throw new HTTPException(403, { message: "Untrusted origin" });
  try {
    await consumeAuthLimit(
      "magic-confirm",
      c.req.header("x-kaneo-client-ip") || "unknown",
      10,
      60,
    );
    const response = await auth.api.magicLinkVerify({
      query: { token: c.req.valid("json").token },
      headers: c.req.raw.headers,
      asResponse: true,
    });
    if (!response.ok) {
      if (response.status === 403)
        throw new HTTPException(403, { message: "Sign-in is not allowed" });
      throw new HTTPException(400, {
        message: "Invalid or expired sign-in link",
      });
    }
    for (const cookie of response.headers.getSetCookie())
      c.header("Set-Cookie", cookie, { append: true });
    c.header("Cache-Control", "no-store");
    return c.json({ success: true as const }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 429)
        throw new HTTPException(429, { message: "Too many attempts" });
      throw new HTTPException(400, {
        message: "Invalid or expired sign-in link",
      });
    }
    throw error;
  }
});
