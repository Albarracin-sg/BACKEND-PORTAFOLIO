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
    let attemptData = {
      name: data.name,
      email: data.email,
      company: data.company,
      subject: data.subject,
      message: data.message,
    };

    let message;
    let success = false;
    let retries = 3;

    while (!success && retries > 0) {
      try {
        message = await this.prisma.contactMessage.create({
          data: attemptData,
        });
        success = true;
      } catch (error) {
        retries--;
        // Si el error es que una columna no existe, la eliminamos de los datos e intentamos de nuevo
        const missingColumnMatch = error.message && error.message.match(/column `([^`]+)` does not exist/);
        
        if (missingColumnMatch) {
          const colName = missingColumnMatch[1];
          console.warn(`⚠️ Column "${colName}" missing in DB, removing from payload and retrying...`);
          
          // @ts-ignore
          delete attemptData[colName];
          
          if (retries === 0) throw error;
        } else {
          throw error;
        }
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
