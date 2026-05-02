import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createMessage(data: CreateContactDto) {
    let message;
    try {
      message = await this.prisma.contactMessage.create({
        data: {
          name: data.name,
          email: data.email,
          company: data.company,
          subject: data.subject,
          message: data.message,
        },
      });
    } catch (error) {
      // Si el error es que la columna 'company' no existe, intentamos sin ella
      if (error.message && error.message.includes('column `company` does not exist')) {
        console.warn('⚠️ Column "company" missing in DB, retrying without it...');
        message = await this.prisma.contactMessage.create({
          data: {
            name: data.name,
            email: data.email,
            subject: data.subject,
            message: data.message,
          },
        });
      } else {
        throw error;
      }
    }

    // Enviar notificación por mail usando el nuevo servicio
    try {
      // Enviar al admin
      await this.mailService.sendContactEmail(data);
      // Enviar confirmación al usuario
      await this.mailService.sendConfirmationEmail(data);
    } catch (error) {
      console.error('❌ ERROR ENVIANDO MAILS DE CONTACTO:', error);
      if (error.response) {
        console.error('Detalle del servidor de mail:', error.response);
      }
    }

    return message;
  }

  async listMessages() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
