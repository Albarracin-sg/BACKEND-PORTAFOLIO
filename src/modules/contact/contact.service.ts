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
    const message = await this.prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        company: data.company,
        subject: data.subject,
        message: data.message,
      },
    });

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
