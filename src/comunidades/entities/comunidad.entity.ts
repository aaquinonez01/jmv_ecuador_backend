import { User } from 'src/auth/entities/user';
import { Zona } from 'src/zonas/entities/zona.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('comunidades')
export class Comunidad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'varchar', length: 120 })
  ciudad!: string;

  @Column({ type: 'varchar', length: 140 })
  correoElectronico!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitud?: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitud?: number | null;

  @ManyToOne(() => Zona, (zona) => zona.comunidades, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: true,
  })
  zona!: Zona;

  @OneToMany(() => User, (user) => user.comunidad)
  usuarios?: User[];
}
