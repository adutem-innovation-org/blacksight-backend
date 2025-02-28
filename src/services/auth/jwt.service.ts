import { config } from "@/config";
import { Request } from "express";
import jwt from "jsonwebtoken";

export class JwtService {
  private static instance: JwtService;

  static getInstance(): JwtService {
    if (!this.instance) {
      this.instance = new JwtService();
    }
    return this.instance;
  }

  extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }

  generateToken(authId: string, expires: number): string {
    return jwt.sign({ authId }, config.jwt.privateKey, {
      expiresIn: expires || config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      algorithm: "RS256",
    });
  }

  verifyToken(token: string) {
    const jwtToken = jwt.verify(token, config.jwt.publicKey!, {
      complete: true,
      issuer: config.jwt.issuer,
    });
    return jwtToken.payload;
  }
}
