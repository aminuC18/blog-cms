import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('The email or password you entered is incorrect.');
    }

    const valid = await this.usersService.validatePassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('The email or password you entered is incorrect.');
    }

    const tokens = await this.issueTokens(user._id.toString(), user.email, user.role);
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiry);
    await this.usersService.storeRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
      tokens.refreshExpiry,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.usersService.sanitize(user),
    };
  }

  async refresh(user: { _id: string; email: string; role: string }, res: Response) {
    const tokens = await this.issueTokens(user._id.toString(), user.email, user.role);
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiry);
    await this.usersService.storeRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
      tokens.refreshExpiry,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, res: Response) {
    await this.usersService.clearRefreshToken(userId);
    res.clearCookie('refreshToken', this.cookieOptions());
    return { message: 'Logged out' };
  }

  me(user: unknown) {
    return user;
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRY', '15m') as `${number}m`,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d') as `${number}d`,
    });

    const refreshExpiry = new Date(
      Date.now() + this.parseExpiryMs(this.configService.get('JWT_REFRESH_EXPIRY', '7d')),
    );

    return { accessToken, refreshToken, refreshExpiry };
  }

  private setRefreshCookie(res: Response, token: string, expiry: Date) {
    res.cookie('refreshToken', token, {
      ...this.cookieOptions(),
      expires: expiry,
    });
  }

  private cookieOptions() {
    const override = this.configService.get<string>('COOKIE_SECURE');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', '');
    const secure =
      override === 'true' || override === '1'
        ? true
        : override === 'false' || override === '0'
          ? false
          : frontendUrl.startsWith('https://');

    return {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private parseExpiryMs(value: string) {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * multipliers[unit];
  }
}
