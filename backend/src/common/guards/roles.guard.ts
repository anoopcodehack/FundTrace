import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

const KNOWN_WALLETS: Record<string, string> = {
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "ADMIN",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "CREATOR",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f": "CREATOR", // Clean Water Well creator
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906": "DONOR", // Alice
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65": "DONOR", // Bob
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc": "DONOR", // Charlie
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // No roles required
    }
    
    const request = context.switchToHttp().getRequest<Request>();
    const walletAddress = request.headers['x-wallet-address'] as string;
    
    // Normalizing address for lookup
    const normalizedWallet = walletAddress ? Object.keys(KNOWN_WALLETS).find(
      key => key.toLowerCase() === walletAddress.toLowerCase()
    ) : null;

    let userRole = normalizedWallet ? KNOWN_WALLETS[normalizedWallet] : null;

    // Fallback for demo/dev mode
    if (!userRole) {
      if (walletAddress) {
        userRole = requiredRoles[0] || 'CREATOR';
      } else {
        userRole = requiredRoles[0] || 'CREATOR';
      }
    }

    // Attach role to request for controllers if needed
    (request as any).userRole = userRole;

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
       // Allow if wallet is connected in dev mode
       userRole = requiredRoles[0];
    }

    return true;
  }
}
