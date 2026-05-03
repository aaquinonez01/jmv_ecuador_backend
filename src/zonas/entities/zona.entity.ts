import { Comunidad } from 'src/comunidades/entities/comunidad.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zonas')
export class Zona {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column('text', { array: true, default: '{}' })
  ciudades!: string[];

  @Column({ type: 'varchar', length: 120, nullable: true })
  nombreCoordinador?: string | null;

  @OneToMany(() => Comunidad, (comunidad) => comunidad.zona)
  comunidades?: Comunidad[];
}
