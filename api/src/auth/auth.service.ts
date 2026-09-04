import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1h

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  private publicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      hasPassword: !!user.passwordHash,
      googleLinked: !!user.googleId,
    };
  }

  private async issueSession(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      token: await this.jwt.signAsync(payload),
      user: this.publicUser(user),
    };
  }

  private webBaseUrl(): string {
    const raw =
      process.env.APP_WEB_URL ??
      process.env.WEB_ORIGIN ??
      'http://localhost:5173';
    return raw.split(',')[0].trim().replace(/\/$/, '');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private registrationOpen(): boolean {
    return process.env.REGISTRATION_OPEN !== 'false';
  }

  private adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Promove a ADMIN se o e-mail estiver em ADMIN_EMAILS. Retorna o usuário atualizado. */
  private async applyAdminAllowlist(user: User): Promise<User> {
    if (user.role === 'ADMIN') return user;
    if (!this.adminEmails().includes(user.email.toLowerCase())) return user;
    return this.prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    });
  }

  async login(email: string, password: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Essa conta foi criada com o Google. Use "Entrar com o Google".',
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');
    user = await this.applyAdminAllowlist(user);
    return this.issueSession(user);
  }

  async register(name: string, email: string, password: string) {
    if (!this.registrationOpen()) {
      throw new ForbiddenException('Cadastro aberto está desativado');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (exists) throw new BadRequestException('E-mail já cadastrado');

    let user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'USER',
      },
    });
    user = await this.applyAdminAllowlist(user);
    return this.issueSession(user);
  }

  // ---- Google Identity Services ----

  private getGoogleClient(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Login com Google não está configurado no servidor',
      );
    }
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(clientId);
    }
    return this.googleClient;
  }

  async loginWithGoogle(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID as string;
    const client = this.getGoogleClient();

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token do Google inválido');
    }

    if (!payload?.email || payload.email_verified === false) {
      throw new UnauthorizedException('E-mail do Google não verificado');
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name?.trim() || email.split('@')[0];
    const avatarUrl = payload.picture ?? null;

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!existing.active) {
        throw new UnauthorizedException('Conta desativada');
      }
      let user =
        existing.googleId && existing.avatarUrl
          ? existing
          : await this.prisma.user.update({
              where: { id: existing.id },
              data: {
                googleId: existing.googleId ?? googleId,
                avatarUrl: existing.avatarUrl ?? avatarUrl,
              },
            });
      user = await this.applyAdminAllowlist(user);
      return this.issueSession(user);
    }

    if (!this.registrationOpen()) {
      throw new ForbiddenException('Cadastro aberto está desativado');
    }

    let user = await this.prisma.user.create({
      data: { name, email, googleId, avatarUrl, role: 'USER' },
    });
    user = await this.applyAdminAllowlist(user);
    return this.issueSession(user);
  }

  // ---- perfil ----

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string | null }) {
    const patch: { name?: string; avatarUrl?: string | null } = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.avatarUrl !== undefined) {
      patch.avatarUrl = data.avatarUrl === '' ? null : data.avatarUrl;
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: patch,
    });
    return this.publicUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('Informe a senha atual');
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) throw new BadRequestException('Senha atual incorreta');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    return { ok: true };
  }

  // ---- reset de senha ----

  /** Sempre responde ok (não revela se o e-mail existe). */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && user.active) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: this.hashToken(token),
          resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });
      const link = `${this.webBaseUrl()}/redefinir-senha?token=${token}`;
      await this.mail.sendPasswordReset(user.email, user.name, link);
    }

    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetTokenHash: this.hashToken(token),
        resetTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('Link inválido ou expirado');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }
}
