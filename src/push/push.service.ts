import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export interface PushMessage {
  title: string;
  body: string;
  /** Lo lee la app al tocar el aviso, p. ej. { screen: '/amigos' } */
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

// Avisos al celular con el servicio gratuito de Expo. Nunca lanza: un aviso
// que falla no debe romper la acción que lo originó.
@Injectable()
export class PushService {
  private readonly logger = new Logger('PushService');

  constructor(private readonly dataSource: DataSource) {}

  isValidToken(token: string) {
    return TOKEN_RE.test(token);
  }

  async register(userId: string, token: string, platform?: string) {
    // Un dispositivo pertenece a un solo usuario: si otro inicia sesión en el mismo celular, se reasigna
    await this.dataSource.query(
      `INSERT INTO push_tokens (token, "userId", platform, "updatedAt") VALUES ($1, $2, $3, now())
       ON CONFLICT (token) DO UPDATE SET "userId" = EXCLUDED."userId", platform = EXCLUDED.platform, "updatedAt" = now()`,
      [token, userId, platform ?? null],
    );
  }

  async unregister(userId: string, token: string) {
    await this.dataSource.query(
      `DELETE FROM push_tokens WHERE token = $1 AND "userId" = $2`,
      [token, userId],
    );
  }

  /** Envía sin esperar (fire-and-forget) */
  notify(userIds: string[], message: PushMessage) {
    void this.send(userIds, message);
  }

  /** A todos los celulares registrados (novedades: libro o formación nueva) */
  notifyAll(message: PushMessage) {
    void this.dataSource
      .query<{ token: string }[]>(`SELECT token FROM push_tokens`)
      .then((rows) =>
        this.sendToTokens(
          rows.map((r) => r.token),
          message,
        ),
      )
      .catch((e: Error) =>
        this.logger.warn(`No se pudo enviar un aviso general: ${e.message}`),
      );
  }

  async send(userIds: string[], message: PushMessage) {
    if (userIds.length === 0) return;
    try {
      const rows: { token: string }[] = await this.dataSource.query(
        `SELECT token FROM push_tokens WHERE "userId" = ANY($1::uuid[])`,
        [userIds],
      );
      await this.sendToTokens(
        rows.map((r) => r.token),
        message,
      );
    } catch (e) {
      this.logger.warn(`No se pudo enviar un aviso: ${(e as Error).message}`);
    }
  }

  private async sendToTokens(tokens: string[], message: PushMessage) {
    if (tokens.length === 0) return;
    try {
      for (let i = 0; i < tokens.length; i += 100) {
        const chunk = tokens.slice(i, i + 100);
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(
            chunk.map((to) => ({
              to,
              sound: 'default',
              // Alta prioridad: se muestra al instante aunque la app esté cerrada
              priority: 'high',
              channelId: 'avisos',
              title: message.title,
              body: message.body,
              data: message.data ?? {},
            })),
          ),
        });
        if (!res.ok) {
          this.logger.warn(
            `Expo push respondió ${res.status}: ${(await res.text()).slice(0, 300)}`,
          );
          continue;
        }
        const { data } = (await res.json()) as { data?: ExpoTicket[] };
        // Errores de entrega (p. ej. credenciales de Firebase que faltan): al log
        for (const t of data ?? []) {
          if (
            t.status === 'error' &&
            t.details?.error !== 'DeviceNotRegistered'
          )
            this.logger.warn(`Aviso rechazado por Expo: ${JSON.stringify(t)}`);
        }
        // Celulares que desinstalaron la app: se borran sus tokens
        const dead = (data ?? [])
          .map((t, k) =>
            t.status === 'error' && t.details?.error === 'DeviceNotRegistered'
              ? chunk[k]
              : null,
          )
          .filter((t): t is string => Boolean(t));
        if (dead.length) {
          await this.dataSource.query(
            `DELETE FROM push_tokens WHERE token = ANY($1)`,
            [dead],
          );
        }
      }
    } catch (e) {
      this.logger.warn(`No se pudo enviar un aviso: ${(e as Error).message}`);
    }
  }
}
