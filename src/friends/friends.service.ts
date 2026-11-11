import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { DataSource } from 'typeorm';
import { PushService } from 'src/push/push.service';

// Sin letras ni números que se confunden al dictarlos (O/0, I/1)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_FRIENDS = 200;
const MAX_OUTGOING = 30;

/** En Postgres, UPDATE ... RETURNING vía query() devuelve [filas, conteo] */
const returned = <T>(result: unknown): T[] =>
  (Array.isArray(result) && Array.isArray(result[0])
    ? result[0]
    : result) as T[];

export type Relation = 'none' | 'friends' | 'outgoing' | 'incoming' | 'blocked';

interface Row {
  id: string;
  fullName: string;
  displayName: string | null;
  profilePicture: string | null;
  level: string | null;
  memberStatus: string;
  pointsBalance: number;
  comunidad: string | null;
}

interface FriendshipRow {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'blocked';
  blockedById: string | null;
}

// Lo único que un joven ve de otro: sin correo, teléfono ni dirección
const PROFILE_COLUMNS = `u.id, u."fullName", u."displayName", u."profilePicture", u.level,
  u."memberStatus", u."pointsBalance", c.nombre AS comunidad`;

const profile = (r: Row) => ({
  id: r.id,
  name: r.displayName || r.fullName,
  fullName: r.fullName,
  avatar: r.profilePicture,
  level: r.level,
  verified: r.memberStatus === 'verified',
  points: r.pointsBalance,
  comunidad: r.comunidad,
});

@Injectable()
export class FriendsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly push: PushService,
  ) {}

  // ── Código ──────────────────────────────────────────────────────────────

  async myCode(userId: string): Promise<string> {
    const [row]: { friendCode: string | null }[] = await this.dataSource.query(
      `SELECT "friendCode" FROM "user" WHERE id = $1`,
      [userId],
    );
    if (!row) throw new NotFoundException('Usuario no encontrado');
    if (row.friendCode) return row.friendCode;
    for (let i = 0; i < 8; i++) {
      const code = Array.from(
        { length: 6 },
        () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
      ).join('');
      try {
        const updated = returned<{ friendCode: string }>(
          await this.dataSource.query(
            `UPDATE "user" SET "friendCode" = $2 WHERE id = $1 AND "friendCode" IS NULL RETURNING "friendCode"`,
            [userId, code],
          ),
        );
        if (updated.length) return updated[0].friendCode;
        return this.myCode(userId); // otro proceso lo generó a la vez
      } catch (e) {
        if ((e as { code?: string }).code !== '23505') throw e; // código repetido: otro intento
      }
    }
    throw new BadRequestException(
      'No se pudo generar tu código. Inténtalo otra vez.',
    );
  }

  // ── Lectura ─────────────────────────────────────────────────────────────

  private async profiles(where: string, params: unknown[]): Promise<Row[]> {
    return this.dataSource.query(
      `SELECT ${PROFILE_COLUMNS} FROM "user" u LEFT JOIN comunidades c ON c.id = u."comunidadId" WHERE ${where}`,
      params,
    );
  }

  private async friendship(
    a: string,
    b: string,
  ): Promise<FriendshipRow | null> {
    const [row]: FriendshipRow[] = await this.dataSource.query(
      `SELECT id, "requesterId", "addresseeId", status, "blockedById" FROM friendships
       WHERE LEAST("requesterId", "addresseeId") = LEAST($1::uuid, $2::uuid)
         AND GREATEST("requesterId", "addresseeId") = GREATEST($1::uuid, $2::uuid)`,
      [a, b],
    );
    return row ?? null;
  }

  private relation(me: string, f: FriendshipRow | null): Relation {
    if (!f) return 'none';
    if (f.status === 'accepted') return 'friends';
    if (f.status === 'blocked') return 'blocked';
    return f.requesterId === me ? 'outgoing' : 'incoming';
  }

  async overview(me: string) {
    const code = await this.myCode(me);
    const rows: (Row & {
      fid: string;
      status: string;
      requesterId: string;
      blockedById: string | null;
      since: Date;
    })[] = await this.dataSource.query(
      `SELECT ${PROFILE_COLUMNS}, f.id AS fid, f.status, f."requesterId", f."blockedById",
                COALESCE(f."respondedAt", f."createdAt") AS since
         FROM friendships f
         JOIN "user" u ON u.id = CASE WHEN f."requesterId" = $1 THEN f."addresseeId" ELSE f."requesterId" END
         LEFT JOIN comunidades c ON c.id = u."comunidadId"
         WHERE (f."requesterId" = $1 OR f."addresseeId" = $1) AND u."isActive" = true
         ORDER BY u."pointsBalance" DESC, u."fullName" ASC`,
      [me],
    );
    const [meRow] = await this.profiles(`u.id = $1`, [me]);
    const item = (r: (typeof rows)[number]) => ({
      ...profile(r),
      friendshipId: r.fid,
      since: r.since,
    });
    return {
      code,
      me: meRow ? profile(meRow) : null,
      friends: rows.filter((r) => r.status === 'accepted').map(item),
      incoming: rows
        .filter((r) => r.status === 'pending' && r.requesterId !== me)
        .map(item),
      outgoing: rows
        .filter((r) => r.status === 'pending' && r.requesterId === me)
        .map(item),
      blocked: rows
        .filter((r) => r.status === 'blocked' && r.blockedById === me)
        .map(item),
    };
  }

  async lookup(me: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const [row] = await this.profiles(
      `u."friendCode" = $1 AND u."isActive" = true`,
      [code],
    );
    if (!row)
      throw new NotFoundException(
        'No encontramos a nadie con ese código. Revísalo.',
      );
    if (row.id === me)
      throw new BadRequestException('Ese es tu propio código 🙂');
    const f = await this.friendship(me, row.id);
    // Si te bloquearon, no se revela: se ve como cualquier otra persona
    const rel = this.relation(me, f);
    return {
      ...profile(row),
      relation: rel === 'blocked' && f?.blockedById !== me ? 'none' : rel,
    };
  }

  /** Personas de tu misma comunidad (no se busca en todo el país, por privacidad de los menores) */
  async searchMyComunidad(me: string, q?: string) {
    const [mine]: { comunidadId: string | null }[] =
      await this.dataSource.query(
        `SELECT "comunidadId" FROM "user" WHERE id = $1`,
        [me],
      );
    if (!mine?.comunidadId) return { comunidad: null, items: [] };
    const params: unknown[] = [me, mine.comunidadId];
    let filter = '';
    if (q?.trim()) {
      params.push(`%${q.trim()}%`);
      filter = `AND (u."fullName" ILIKE $3 OR u."displayName" ILIKE $3)`;
    }
    const rows: (Row & {
      status: string | null;
      requesterId: string | null;
      blockedById: string | null;
    })[] = await this.dataSource.query(
      `SELECT ${PROFILE_COLUMNS}, f.status, f."requesterId", f."blockedById"
         FROM "user" u
         LEFT JOIN comunidades c ON c.id = u."comunidadId"
         LEFT JOIN friendships f ON LEAST(f."requesterId", f."addresseeId") = LEAST(u.id, $1::uuid)
                                AND GREATEST(f."requesterId", f."addresseeId") = GREATEST(u.id, $1::uuid)
         WHERE u."comunidadId" = $2 AND u.id <> $1 AND u."isActive" = true AND u.role = 'user'
           AND (f.status IS NULL OR f.status <> 'blocked') ${filter}
         ORDER BY u."fullName" ASC LIMIT 30`,
      params,
    );
    return {
      comunidad: rows[0]?.comunidad ?? null,
      items: rows.map((r) => ({
        ...profile(r),
        relation: this.relation(
          me,
          r.status
            ? {
                id: '',
                requesterId: r.requesterId ?? '',
                addresseeId: '',
                status: r.status as FriendshipRow['status'],
                blockedById: r.blockedById,
              }
            : null,
        ),
      })),
    };
  }

  // ── Acciones ────────────────────────────────────────────────────────────

  private async name(id: string) {
    const [r]: { n: string }[] = await this.dataSource.query(
      `SELECT COALESCE(NULLIF("displayName", ''), "fullName") AS n FROM "user" WHERE id = $1`,
      [id],
    );
    return r?.n ?? 'Alguien';
  }

  async request(me: string, target: { code?: string; userId?: string }) {
    let targetId = target.userId;
    if (target.code) targetId = (await this.lookup(me, target.code)).id;
    if (!targetId)
      throw new BadRequestException('Indica a quién quieres agregar');
    if (targetId === me)
      throw new BadRequestException('No puedes agregarte a ti mismo');
    const [exists] = await this.profiles(`u.id = $1 AND u."isActive" = true`, [
      targetId,
    ]);
    if (!exists) throw new NotFoundException('Esa persona no existe');

    const f = await this.friendship(me, targetId);
    const rel = this.relation(me, f);
    if (rel === 'friends') return { status: 'friends' as const };
    if (rel === 'outgoing') return { status: 'outgoing' as const };
    if (rel === 'blocked')
      throw new BadRequestException(
        'No se puede enviar la solicitud a esta persona.',
      );
    if (rel === 'incoming') {
      await this.accept(me, f!.id);
      return { status: 'friends' as const };
    }

    const [{ total, outgoing }]: { total: number; outgoing: number }[] =
      await this.dataSource.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'accepted' OR (status = 'pending' AND "requesterId" = $1))::int AS total,
              COUNT(*) FILTER (WHERE status = 'pending' AND "requesterId" = $1)::int AS outgoing
       FROM friendships WHERE "requesterId" = $1 OR "addresseeId" = $1`,
        [me],
      );
    if (total >= MAX_FRIENDS)
      throw new BadRequestException(
        `Llegaste al máximo de ${MAX_FRIENDS} amigos.`,
      );
    if (outgoing >= MAX_OUTGOING)
      throw new BadRequestException(
        'Tienes muchas solicitudes sin responder. Espera a que te acepten.',
      );

    await this.dataSource.query(
      `INSERT INTO friendships ("requesterId", "addresseeId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [me, targetId],
    );
    this.push.notify([targetId], {
      title: 'Nueva solicitud de amistad',
      body: `${await this.name(me)} quiere ser tu amigo en JMV`,
      data: { screen: '/amigos' },
    });
    return { status: 'outgoing' as const };
  }

  async accept(me: string, friendshipId: string) {
    const rows: { requesterId: string }[] = await this.dataSource.query(
      `UPDATE friendships SET status = 'accepted', "respondedAt" = now()
       WHERE id = $1 AND "addresseeId" = $2 AND status = 'pending' RETURNING "requesterId"`,
      [friendshipId, me],
    );
    // TypeORM devuelve [filas, conteo] en UPDATE ... RETURNING
    const updated = (Array.isArray(rows[0]) ? rows[0] : rows) as {
      requesterId: string;
    }[];
    if (!updated.length)
      throw new NotFoundException('La solicitud ya no existe');
    this.push.notify([updated[0].requesterId], {
      title: '¡Tienes un nuevo amigo!',
      body: `${await this.name(me)} aceptó tu solicitud`,
      data: { screen: '/amigos' },
    });
    return { status: 'friends' as const };
  }

  /** Rechazar una solicitud recibida o cancelar una enviada */
  async decline(me: string, friendshipId: string) {
    await this.dataSource.query(
      `DELETE FROM friendships WHERE id = $1 AND status = 'pending' AND ("addresseeId" = $2 OR "requesterId" = $2)`,
      [friendshipId, me],
    );
  }

  async remove(me: string, otherId: string) {
    const f = await this.friendship(me, otherId);
    if (f && f.status !== 'blocked') {
      await this.dataSource.query(`DELETE FROM friendships WHERE id = $1`, [
        f.id,
      ]);
    }
  }

  async block(me: string, otherId: string) {
    if (otherId === me)
      throw new BadRequestException('No puedes bloquearte a ti mismo');
    await this.dataSource.query(
      `INSERT INTO friendships ("requesterId", "addresseeId", status, "blockedById", "respondedAt")
       VALUES ($1, $2, 'blocked', $1, now())
       ON CONFLICT (LEAST("requesterId", "addresseeId"), GREATEST("requesterId", "addresseeId"))
       DO UPDATE SET status = 'blocked', "blockedById" = $1, "respondedAt" = now()
       WHERE friendships.status <> 'blocked'`,
      [me, otherId],
    );
  }

  async unblock(me: string, otherId: string) {
    const f = await this.friendship(me, otherId);
    if (f && f.status === 'blocked' && f.blockedById === me) {
      await this.dataSource.query(`DELETE FROM friendships WHERE id = $1`, [
        f.id,
      ]);
    }
  }
}
