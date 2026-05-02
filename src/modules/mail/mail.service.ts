import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { CreateContactDto } from '../contact/dto/create-contact.dto';

@Injectable()
export class MailService {
  private resend: Resend;
  private templatesDir: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
    this.templatesDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'modules',
      'mail',
      'templates',
    );
  }

  private compileTemplate(templateName: string, context: object): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);
    return template(context);
  }

  async sendContactEmail(data: CreateContactDto) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') ?? 'albarrajuan5@gmail.com';
    console.log(`📧 Intentando enviar mail de notificación a admin: ${adminEmail}`);

    try {
      const html = this.compileTemplate('admin-notification', {
        name: data.name,
        email: data.email,
        company: data.company,
        subject: data.subject,
        message: data.message,
      });

      await this.resend.emails.send({
        from: `Portfolio <onboarding@resend.dev>`,
        to: adminEmail,
        subject: `Nuevo contacto: ${data.subject}`,
        html,
      });

      console.log('✅ Mail de notificación enviado correctamente');
    } catch (err) {
      console.error('❌ Error al enviar mail de notificación:', err);
      throw err;
    }
  }

  async sendConfirmationEmail(data: CreateContactDto) {
    const userEmail = data.email ?? 'user@example.com';
    console.log(`📧 Intentando enviar mail de confirmación a usuario: ${userEmail}`);

    try {
      const html = this.compileTemplate('user-confirmation', {
        name: data.name,
        email: userEmail,
        subject: data.subject,
        company: data.company,
        message: data.message,
      });

      await this.resend.emails.send({
        from: `Portfolio <onboarding@resend.dev>`,
        to: userEmail,
        subject: '¡Gracias por contactarme!',
        html,
      });

      console.log('✅ Mail de confirmación enviado correctamente');
    } catch (err) {
      console.error('❌ Error al enviar mail de confirmación:', err);
      throw err;
    }
  }
}