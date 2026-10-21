import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entities/user';
import { Repository } from 'typeorm';
import { usersData } from './data/users.data';
import { Post, PostImage } from 'src/posts/entities';
import { Scope } from 'src/category_post/entities/scope.entity';
import { Subtype } from 'src/category_post/entities/subtype.entity';
import { ActivityType } from 'src/category_post/entities/activity-type.entity';
import * as bcrypt from 'bcrypt';
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private readonly postImageRepository: Repository<PostImage>,

    @InjectRepository(Scope)
    private readonly scopeRepository: Repository<Scope>,
    @InjectRepository(Subtype)
    private readonly subtypeRepository: Repository<Subtype>,
    @InjectRepository(ActivityType)
    private readonly activityTypeRepository: Repository<ActivityType>,
  ) {}
  private readonly logger = new Logger('SeedService');

  async onApplicationBootstrap() {
    try {
      await this.ensureInitialAdmin();
    } catch (error) {
      // Nunca impedir el arranque (p. ej. si aún no existen las tablas)
      this.logger.error(
        `No se pudo crear el administrador inicial: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Crea el primer administrador si se definen ADMIN_EMAIL y ADMIN_PASSWORD en
   * el .env y todavía no existe ningún admin. Sirve para arrancar con la base
   * vacía; después se pueden quitar esas variables.
   */
  private async ensureInitialAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    if (password.length < 10) {
      this.logger.warn(
        'ADMIN_PASSWORD debe tener al menos 10 caracteres; no se creó el admin',
      );
      return;
    }

    const adminExists = await this.userRepository.exists({
      where: { role: 'admin' },
    });
    if (adminExists) return;

    const admin = this.userRepository.create({
      email,
      password: await bcrypt.hash(password, 10),
      fullName: 'JMV Consejo Nacional Ecuador',
      displayName: 'JMV Consejo Nacional Ecuador',
      role: 'admin',
      isActive: true,
      phoneNumber: '',
      address: 'Quito, Ecuador',
      bio: '',
    });
    await this.userRepository.save(admin);
    this.logger.log(`Administrador inicial creado: ${email}`);
  }

  async executeSeed() {
    try {
      // await this.deleteTables();
      await this.insertUsers();
      return 'Seed executed successfully';
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private async deleteTables() {
    try {
      // Borrar en orden inverso a las dependencias
      await this.postImageRepository.clear();
      await this.postRepository.clear();
      await this.scopeRepository.clear();
      await this.activityTypeRepository.clear();
      await this.subtypeRepository.clear();
      await this.userRepository.clear();
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private async insertUsers() {
    const users: User[] = [];

    try {
      for (const user of usersData) {
        user.password = await bcrypt.hash(user.password, 10);
        users.push(this.userRepository.create(user));
      }
      await this.userRepository.save(users);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown) {
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al realizar la operación',
      error instanceof Error ? error.message : 'Error desconocido',
    );
  }
}
