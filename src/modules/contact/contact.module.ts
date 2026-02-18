import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactPublicController } from './contact.public.controller';
import { ContactAdminController } from './contact.admin.controller';

@Module({
  controllers: [ContactPublicController, ContactAdminController],
  providers: [ContactService],
})
export class ContactModule {}
