import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@ApiTags('public-contact')
@Controller('public/contact')
@UseGuards(RateLimitGuard)
@RateLimit('contact')
export class ContactPublicController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  createMessage(@Body() body: CreateContactDto) {
    return this.contactService.createMessage(body);
  }
}
