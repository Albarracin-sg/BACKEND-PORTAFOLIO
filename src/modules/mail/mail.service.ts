import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
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
        text: this.buildAdminNotificationText(data),
        html: this.buildAdminNotificationHtml(data),
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
        text: this.buildUserConfirmationText(data),
        html: this.buildUserConfirmationHtml(data),
      });
      console.log('✅ Mail de confirmación enviado correctamente');
    } catch (err) {
      console.error('❌ Error al enviar mail de confirmación:', err);
      throw err;
    }
  }

  private buildAdminNotificationText(data: CreateContactDto) {
    return [
      'Nuevo mensaje recibido desde el portafolio',
      '',
      `Nombre: ${data.name}`,
      `Email: ${data.email}`,
      `Empresa: ${data.company || 'No especificada'}`,
      `Asunto: ${data.subject}`,
      '',
      'Mensaje:',
      data.message,
    ].join('\n');
  }

  private buildAdminNotificationHtml(data: CreateContactDto) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 16px;">Nuevo mensaje recibido desde el portafolio</h2>
        <p><strong>Nombre:</strong> ${this.escapeHtml(data.name)}</p>
        <p><strong>Email:</strong> ${this.escapeHtml(data.email)}</p>
        <p><strong>Empresa:</strong> ${this.escapeHtml(data.company || 'No especificada')}</p>
        <p><strong>Asunto:</strong> ${this.escapeHtml(data.subject)}</p>
        <div style="margin-top: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px; white-space: pre-wrap;">
          ${this.escapeHtml(data.message)}
        </div>
      </div>
    `;
  }

  private buildUserConfirmationText(data: CreateContactDto) {
    return [
      `Hola ${data.name},`,
      '',
      'Gracias por contactarme desde el portafolio.',
      'Recibí tu mensaje y te responderé lo antes posible.',
      '',
      `Asunto: ${data.subject}`,
      `Empresa: ${data.company || 'No especificada'}`,
      '',
      'Mensaje enviado:',
      data.message,
    ].join('\n');
  }

  private buildUserConfirmationHtml(data: CreateContactDto) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 16px;">¡Gracias por contactarme!</h2>
        <p>Hola <strong>${this.escapeHtml(data.name)}</strong>,</p>
        <p>Recibí tu mensaje y te responderé lo antes posible.</p>
        <p><strong>Asunto:</strong> ${this.escapeHtml(data.subject)}</p>
        <p><strong>Empresa:</strong> ${this.escapeHtml(data.company || 'No especificada')}</p>
        <div style="margin-top: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px; white-space: pre-wrap;">
          ${this.escapeHtml(data.message)}
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
