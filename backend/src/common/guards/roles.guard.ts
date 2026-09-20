import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

const KNOWN_WALLETS: Record<string, string> = {
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "ADMIN",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "CREATOR",
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
    
    if (!walletAddress) {
      throw new ForbiddenException('Wallet address header required for authentication');
    }

    // Normalizing address for lookup
    const normalizedWallet = Object.keys(KNOWN_WALLETS).find(
      key => key.toLowerCase() === walletAddress.toLowerCase()
    );

    const userRole = normalizedWallet ? KNOWN_WALLETS[normalizedWallet] : null;

    if (!userRole) {
      throw new ForbiddenException('Unknown wallet address or role');
    }

    // Attach role to request for controllers if needed
    (request as any).userRole = userRole;

    if (!requiredRoles.includes(userRole)) {
       throw new ForbiddenException(`Access denied. Required role: ${requiredRoles.join(' or ')}`);
    }

    return true;
  }
}
