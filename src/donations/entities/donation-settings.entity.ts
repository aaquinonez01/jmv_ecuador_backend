import {
  Check,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

// Configuración de la página /donar (una sola fila, id = 1). La edita el
// Tesorero/a Nacional en cada período del Consejo. Las donaciones son
// anónimas: no se guarda ningún dato de quien dona.
@Check('chk_donation_settings_singleton', '"id" = 1')
@Entity('donation_settings')
export class DonationSettings {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  headline!: string;

  @Column({ type: 'text' })
  intro!: string;

  @Column({ type: 'varchar', length: 300 })
  contactNote!: string;

  // Solo dígitos con el código de país (p. ej. 593991234567)
  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsapp?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  paypalUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  qrImageUrl?: string | null;

  // Solo para el QR subido a Cloudinary (permite borrarlo)
  @Column({ type: 'text', nullable: true })
  qrImagePublicId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  qrLabel?: string | null;

  @Column({ type: 'text', nullable: true })
  inKindNote?: string | null;

  @Column({ type: 'text', nullable: true })
  transparencyNote?: string | null;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
