import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? 'placeholder',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'placeholder',
      callbackURL: `${config.get<string>('BACKEND_URL') ?? 'http://localhost:8080'}/v1/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      displayName: string;
      emails?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ): void {
    console.log('GoogleStrategy.validate called, profile id:', profile?.id, 'email:', profile?.emails?.[0]?.value);
    const email = profile.emails?.[0]?.value ?? '';
    const user = {
      googleId: profile.id,
      email,
      fullName: profile.displayName,
    };
    console.log('GoogleStrategy.validate user:', user);
    done(null, user);
  }
}
