import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactPublicController } from './contact.public.controller';
import { ContactAdminController } from './contact.admin.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [ContactPublicController, ContactAdminController],
  providers: [ContactService],
})
export class ContactModule {}
