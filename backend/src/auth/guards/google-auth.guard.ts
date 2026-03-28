import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any) {
    console.log('GoogleAuthGuard:', { err: err?.message, user: !!user, info });
    if (err || !user) {
      throw err || new UnauthorizedException('Google OAuth failed');
    }
    return user;
  }
}
