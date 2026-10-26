import { BadRequestException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ActivityTypeCatalog } from './entities/activity-type.entity';

/**
 * Un tipo de actividad pertenece a un pilar (un pilar tiene muchos tipos): una
 * actividad no puede combinar un tipo con un pilar distinto al suyo.
 */
export async function assertTypeMatchesPillar(
  manager: EntityManager,
  typeId?: string | null,
  pillarId?: string | null,
) {
  if (!typeId || !pillarId) return;
  const type = await manager.findOne(ActivityTypeCatalog, {
    where: { id: typeId },
  });
  if (!type) {
    throw new BadRequestException('El tipo de actividad elegido no existe');
  }
  if (type.pillarId && type.pillarId !== pillarId) {
    throw new BadRequestException(
      `El tipo «${type.name}» pertenece a otro pilar. Elige un tipo de este pilar.`,
    );
  }
}
