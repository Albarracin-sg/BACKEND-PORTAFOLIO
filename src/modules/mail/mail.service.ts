import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { CreateContactDto } from '../contact/dto/create-contact.dto';

// Brevo SDK
import SibApiV3Sdk from 'sib-api-v3-sdk';

@Injectable()
export class MailService {
  private apiClient: SibApiV3Sdk.ApiClient;
  private senderEmail: string;
  private senderName: string;
  private templatesDir: string;

  constructor(private readonly configService: ConfigService) {
    // Configure Brevo API client - use env var to avoid exposing in code
    const apiKey = process.env.BREVO_API_KEY || this.configService.get<string>('BREVO_API_KEY');
    
    this.apiClient = SibApiV3Sdk.ApiClient.instance;
    this.apiClient.authentications['api-key'].apiKey = apiKey;

    this.senderEmail = this.configService.get<string>('MAIL_FROM') || 'juancamiloalbarracinurrego@gmail.com';
    this.senderName = this.configService.get<string>('MAIL_FROM_NAME') || 'Portfolio';
    
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

      // Using Brevo SDK to send email
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.sender = { email: this.senderEmail, name: this.senderName };
      sendSmtpEmail.to = [{ email: adminEmail }];
      sendSmtpEmail.subject = `Nuevo contacto: ${data.subject}`;
      sendSmtpEmail.htmlContent = html;

      await apiInstance.sendTransacEmail(sendSmtpEmail);

      console.log('✅ Mail de notificación enviado correctamente');
    } catch (err) {
      console.error('❌ Error al enviar mail de notificación:', err.response?.body || err.message);
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

      // Using Brevo SDK to send email
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.sender = { email: this.senderEmail, name: this.senderName };
      sendSmtpEmail.to = [{ email: userEmail }];
      sendSmtpEmail.subject = '¡Gracias por contactarme!';
      sendSmtpEmail.htmlContent = html;

      await apiInstance.sendTransacEmail(sendSmtpEmail);

      console.log('✅ Mail de confirmación enviado correctamente');
    } catch (err) {
      console.error('❌ Error al enviar mail de confirmación:', err.response?.body || err.message);
      throw err;
    }
  }
}