import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistrarDto } from './dto/registrar.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { JwtUser } from './jwt-user';
import type { Request as Req, Response } from 'express';

const IS_PROD = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

function setCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = { httpOnly: true, secure: IS_PROD, sameSite: 'lax' as const, path: '/' };
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, usuario } = await this.authService.login(body.email, body.senha);
    setCookies(res, accessToken, refreshToken);
    return { usuario };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(201)
  @Post('registrar')
  async registrar(
    @Body() body: RegistrarDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, usuario } = await this.authService.registrar({
      clinicaNome: body.clinicaNome,
      cnpj: body.cnpj,
      telefone: body.telefone,
      clinicaEmail: body.clinicaEmail,
      adminNome: body.adminNome,
      adminEmail: body.adminEmail,
      adminSenha: body.adminSenha,
    });
    setCookies(res, accessToken, refreshToken);
    return { usuario };
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Request() req: Req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    const { accessToken, refreshToken } = await this.authService.refresh(raw);
    setCookies(res, accessToken, refreshToken);
    return { ok: true };
  }

  @HttpCode(200)
  @Post('logout')
  async logout(
    @Request() req: Req,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearCookies(res);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @Post('minha-senha')
  trocarSenha(
    @Request() req: { user: JwtUser },
    @Body() body: TrocarSenhaDto,
  ) {
    return this.authService.trocarSenha(req.user.id, body.senhaAtual, body.novaSenha);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Request() req: { user: JwtUser }) {
    return this.authService.me(req.user.id);
  }
}
