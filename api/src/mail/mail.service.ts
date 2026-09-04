import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    this.from = process.env.MAIL_FROM ?? 'ContaHora <no-reply@contahora.local>';
    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
      this.logger.log(`SMTP configurado em ${host}`);
    } else {
      this.logger.warn(
        'SMTP não configurado (SMTP_HOST). E-mails serão apenas logados no console.',
      );
    }
  }

  async sendPasswordReset(to: string, name: string, link: string) {
    const subject = 'ContaHora — redefinição de senha';
    const text = `Olá ${name},\n\nRecebemos um pedido para redefinir sua senha no ContaHora.\nAbra o link abaixo (expira em 1 hora):\n\n${link}\n\nSe não foi você, ignore este e-mail.`;
    const html = `<p>Olá ${name},</p>
<p>Recebemos um pedido para redefinir sua senha no <b>ContaHora</b>.</p>
<p><a href="${link}">Clique aqui para criar uma nova senha</a> (o link expira em 1 hora).</p>
<p>Se não foi você, ignore este e-mail.</p>`;

    if (!this.transporter) {
      this.logger.warn(
        `\n----- RESET DE SENHA (dev) -----\npara: ${to}\nlink: ${link}\n--------------------------------`,
      );
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
    this.logger.log(`E-mail de reset enviado para ${to}`);
  }
}
