import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any, context: any) {
    console.log('GoogleAuthGuard:', { err: err?.message, user: !!user, info });
    if (err || !user) {
      const res = context.switchToHttp().getResponse();
      const frontendUrl = 'https://jobnova.xyz';
      return res.redirect(`${frontendUrl}/login?error=google_failed`);
    }
    return user;
  }
}
