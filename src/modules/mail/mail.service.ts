import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { CreateContactDto } from '../contact/dto/create-contact.dto';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendContactEmail(data: CreateContactDto) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    console.log(`📧 Intentando enviar mail de notificación a admin: ${adminEmail}`);

    try {
      await this.mailerService.sendMail({
        to: adminEmail,
        subject: `Nuevo contacto: ${data.subject}`,
        template: './admin-notification',
        context: {
          name: data.name,
          email: data.email,
          company: data.company,
          subject: data.subject,
          message: data.message,
        },
        attachments: [
          {
            filename: 'logo.png',
            path: join(__dirname, 'assets/logo.png'),
            cid: 'logo',
          },
        ],
      });
      console.log('✅ Mail de notificación enviado correctamente');
    } catch (err) {
      console.error('❌ Error al enviar mail de notificación:', err);
      throw err;
    }
  }

  async sendConfirmationEmail(data: CreateContactDto) {
    console.log(`📧 Intentando enviar mail de confirmación a usuario: ${data.email}`);
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: '¡Gracias por contactarme!',
        template: './user-confirmation',
        context: {
          name: data.name,
          email: data.email,
          subject: data.subject,
          company: data.company,
          message: data.message,
        },
        attachments: [
          {
            filename: 'logo.png',
            path: join(__dirname, 'assets/logo.png'),
            cid: 'logo',
          },
        ],
      });
      console.log('✅ Mail de confirmación enviado correctamente');
    } catch (err) {
      console.error('❌ Error al enviar mail de confirmación:', err);
      throw err;
    }
  }
}
