// apps/server/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthedRequest extends Request {
  user?: { userId: string; email: string; name?: string };
}

export const auth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  // 1) Try Authorization header
  const header = req.headers.authorization; // "Bearer <token>"
  let token: string | undefined = header?.startsWith("Bearer ")
    ? header.split(" ")[1]
    : undefined;

  // 2) Fallback to cookie
  if (!token && (req as any).cookies?.access_token) {
    token = (req as any).cookies.access_token;
  }

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
      name?: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
