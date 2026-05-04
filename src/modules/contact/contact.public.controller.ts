import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('public-contact')
@Controller('public/contact')
export class ContactPublicController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  createMessage(@Body() body: CreateContactDto) {
    return this.contactService.createMessage(body);
  }
}
