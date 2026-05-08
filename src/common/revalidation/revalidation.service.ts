import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  async revalidate(tags: string[], paths: string[] = []): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL;
    const token = process.env.REVALIDATE_TOKEN;

    if (!frontendUrl || !token) {
      this.logger.debug(
        'FRONTEND_URL o REVALIDATE_TOKEN no configurados, se omite revalidación',
      );
      return;
    }

    if (tags.length === 0 && paths.length === 0) return;

    const url = `${frontendUrl.replace(/\/+$/, '')}/api/revalidate`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-token': token,
        },
        body: JSON.stringify({ tags, paths }),
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) {
        this.logger.warn(
          `Revalidate ${url} respondió ${res.status} para tags=${tags.join(',')}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `No se pudo revalidar ${url}: ${(err as Error).message}`,
      );
    }
  }
}
