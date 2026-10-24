import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Envío de correos por SMTP. Si SMTP_HOST no está configurado no envía nada:
 * solo deja un aviso en el log, para que el resto de la operación no falle.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    // Las variables definidas pero vacías (MAIL_FROM= en .env) cuentan como ausentes
    const env = (key: string) =>
      this.config.get<string>(key)?.trim() || undefined;
    const host = env('SMTP_HOST');
    const user = env('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from = env('MAIL_FROM') || user || 'no-reply@jmvecuador.org';

    if (!host) {
      this.transporter = null;
      this.logger.warn(
        'SMTP no configurado (SMTP_HOST vacío): no se enviarán correos',
      );
      return;
    }

    const parsedPort = parseInt(env('SMTP_PORT') ?? '', 10);
    const port = Number.isNaN(parsedPort) ? 587 : parsedPort;
    const secure = (env('SMTP_SECURE') ?? String(port === 465)) === 'true';

    this.transporter = createTransport({
      host,
      port,
      secure,
      ...(user ? { auth: { user, pass } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /** Devuelve true si se envió. Nunca lanza: los errores solo se registran. */
  async send(options: MailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Correo no enviado (SMTP no configurado): "${options.subject}"`,
      );
      return false;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...options });
      return true;
    } catch (error) {
      this.logger.error(
        `Error al enviar el correo "${options.subject}"`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
