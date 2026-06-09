import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
    clinicaId: string;
  }): string {
    return this.jwtService.sign(payload);
  }

  private async createRefreshToken(usuarioId: string): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const hashToken = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { hashToken, usuarioId, expiresAt } });
    return raw;
  }

  async login(email: string, senha: string) {
    const usuario = await this.usuariosService.findByEmail(email.trim().toLowerCase());
    if (!usuario) throw new UnauthorizedException('Credenciais inválidas');

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) throw new UnauthorizedException('Credenciais inválidas');

    if (!usuario.ativo) throw new UnauthorizedException('Usuário inativo');

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      clinicaId: usuario.clinicaId,
    };

    const accessToken = this.buildAccessToken(payload);
    const refreshToken = await this.createRefreshToken(usuario.id);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        clinicaId: usuario.clinicaId,
      },
    };
  }

  async registrar(data: {
    clinicaNome: string;
    cnpj?: string;
    telefone?: string;
    clinicaEmail?: string;
    adminNome: string;
    adminEmail: string;
    adminSenha: string;
  }) {
    const emailNormalizado = data.adminEmail.trim().toLowerCase();

    const emailExistente = await this.usuariosService.findByEmail(emailNormalizado);
    if (emailExistente) throw new ConflictException('Este e-mail já está cadastrado');

    if (data.cnpj?.trim()) {
      const cnpjExistente = await this.prisma.clinica.findFirst({
        where: { cnpj: data.cnpj.trim() },
      });
      if (cnpjExistente) throw new ConflictException('Este CNPJ já está cadastrado');
    }

    const senhaHash = await bcrypt.hash(data.adminSenha, 10);

    const { clinica, usuario } = await this.prisma.$transaction(async (tx) => {
      const clinica = await tx.clinica.create({
        data: {
          nome: data.clinicaNome.trim(),
          cnpj: data.cnpj?.trim() || null,
          telefone: data.telefone?.trim() || null,
          email: data.clinicaEmail?.trim() || null,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          nome: data.adminNome.trim(),
          email: emailNormalizado,
          senha: senhaHash,
          role: 'ADMIN',
          clinicaId: clinica.id,
        },
      });

      return { clinica, usuario };
    });

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      clinicaId: clinica.id,
    };

    const accessToken = this.buildAccessToken(payload);
    const refreshToken = await this.createRefreshToken(usuario.id);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        clinicaId: clinica.id,
      },
    };
  }

  async trocarSenha(usuarioId: string, senhaAtual: string, novaSenha: string) {
    const usuario = await this.usuariosService.findById(usuarioId);
    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) throw new UnauthorizedException('Senha atual incorreta');

    if (novaSenha.length < 8) {
      throw new BadRequestException('Nova senha deve ter pelo menos 8 caracteres');
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senha: senhaHash },
    });

    return { ok: true };
  }

  async refresh(rawRefreshToken: string) {
    const hashToken = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { hashToken },
      include: { usuario: true },
    });

    if (!stored || stored.revogado || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    if (!stored.usuario.ativo) {
      throw new UnauthorizedException('Usuário inativo');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revogado: true },
    });

    const payload = {
      sub: stored.usuario.id,
      email: stored.usuario.email,
      role: stored.usuario.role,
      clinicaId: stored.usuario.clinicaId,
    };

    const accessToken = this.buildAccessToken(payload);
    const refreshToken = await this.createRefreshToken(stored.usuario.id);

    return { accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    const hashToken = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { hashToken, revogado: false },
      data: { revogado: true },
    });
  }

  async me(id: string) {
    const usuario = await this.usuariosService.findById(id);
    if (!usuario || !usuario.ativo) throw new NotFoundException('Usuário não encontrado');
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      clinicaId: usuario.clinicaId,
    };
  }
}
