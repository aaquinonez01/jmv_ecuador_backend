import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { FilterContactMessagesDto } from './dto/filter-contact-messages.dto';
import { escapeHtml, MailService } from '../mail/mail.service';

const RESPUESTA_OK = {
  ok: true,
  message: '¡Gracias! Recibimos tu mensaje y te responderemos pronto.',
} as const;

@Injectable()
export class ContactMessagesService {
  private readonly logger = new Logger('ContactMessagesService');

  constructor(
    @InjectRepository(ContactMessage)
    private readonly repository: Repository<ContactMessage>,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateContactMessageDto) {
    // Honeypot relleno: se responde igual que si todo fuera bien, sin guardar
    if (dto.website && dto.website.trim() !== '') {
      return RESPUESTA_OK;
    }

    try {
      const message = this.repository.create({
        nombre: dto.nombre,
        email: dto.email,
        asunto: dto.asunto,
        mensaje: dto.mensaje,
        telefono: dto.telefono || null,
        ciudad: dto.ciudad || null,
        origen: dto.origen ?? 'contacto',
      });
      const saved = await this.repository.save(message);
      // Sin await: el correo no debe retrasar ni romper la respuesta
      void this.notify(saved);
      return RESPUESTA_OK;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(filterDto: FilterContactMessagesDto) {
    try {
      const { limit = 20, offset = 0, leido, origen } = filterDto;

      const qb = this.repository
        .createQueryBuilder('message')
        .orderBy('message.createdAt', 'DESC')
        .skip(offset)
        .take(limit);

      if (leido !== undefined) {
        qb.andWhere('message.leido = :leido', { leido: leido === 'true' });
      }
      if (origen) {
        qb.andWhere('message.origen = :origen', { origen });
      }

      const [items, total] = await qb.getManyAndCount();
      const noLeidos = await this.repository.count({
        where: { leido: false },
      });

      return { total, noLeidos, limit, offset, items };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async updateLeido(id: string, leido: boolean) {
    try {
      const message = await this.repository.findOne({ where: { id } });
      if (!message) {
        throw new NotFoundException('Mensaje no encontrado');
      }
      message.leido = leido;
      return await this.repository.save(message);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const message = await this.repository.findOne({ where: { id } });
      if (!message) {
        throw new NotFoundException('Mensaje no encontrado');
      }
      await this.repository.remove(message);
      return { message: 'Mensaje eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private async notify(message: ContactMessage) {
    const to = this.config.get<string>('CONTACT_NOTIFY_TO');
    if (!to) {
      this.logger.warn(
        'CONTACT_NOTIFY_TO vacío: el mensaje se guardó pero no se notificó por correo',
      );
      return;
    }

    const origen = message.origen === 'unete' ? 'Únete' : 'Contacto';
    const filas: [string, string | null | undefined][] = [
      ['Nombre', message.nombre],
      ['Correo', message.email],
      ['Teléfono', message.telefono],
      ['Ciudad', message.ciudad],
      ['Formulario', origen],
      ['Asunto', message.asunto],
    ];
    const visibles = filas.filter(
      (fila): fila is [string, string] => !!fila[1],
    );

    const text = [
      ...visibles.map(([campo, valor]) => `${campo}: ${valor}`),
      '',
      message.mensaje,
    ].join('\n');

    const html = `
      <h2 style="font-family:sans-serif">Nuevo mensaje desde el sitio web</h2>
      <table style="font-family:sans-serif;border-collapse:collapse">
        ${visibles
          .map(
            ([campo, valor]) =>
              `<tr><th style="text-align:left;padding:4px 12px 4px 0">${campo}</th><td style="padding:4px 0">${escapeHtml(valor)}</td></tr>`,
          )
          .join('')}
      </table>
      <p style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(message.mensaje)}</p>
    `;

    await this.mail.send({
      to,
      replyTo: message.email,
      subject: `[JMV Ecuador · ${origen}] ${message.asunto}`,
      text,
      html,
    });
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof NotFoundException) {
      throw error;
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al gestionar los mensajes de contacto',
    );
  }
}
