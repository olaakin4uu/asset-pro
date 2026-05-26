import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<any> {
    // Extract subdomain from request body or Origin header
    const bodySubdomain = (req.body as { subdomain?: string })?.subdomain;
    const origin = req.get('origin') || req.get('referer') || '';

    let subdomain: string | undefined = bodySubdomain;

    // If no subdomain in body, try to extract from origin or x-tenant-subdomain header
    if (!subdomain) {
      // Check nginx-forwarded header first
      const headerSubdomain = req.get('x-tenant-subdomain');
      if (headerSubdomain) {
        subdomain = headerSubdomain;
      } else if (origin) {
        // Extract subdomain from origin using configured domain suffix
        const domainSuffix = process.env.DOMAIN_SUFFIX || 'salvage.test';
        const escaped = domainSuffix.replace(/\./g, '\\.');
        const pattern = new RegExp(`https?://([^.]+)\\.${escaped}`, 'i');
        const match = origin.match(pattern);
        if (match) {
          subdomain = match[1];
        }
      }
    }

    const user = await this.authService.validateUser(email, password, subdomain);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }
}
