import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Authenticate and get a JWT token',
    description: 'Use these demo credentials to test protected endpoints:\n\n**Email:** `admin@portfolio.dev`\n**Password:** `admin123`\n\nThe returned token must be sent as `Authorization: Bearer <token>` to access admin endpoints.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'admin@portfolio.dev' },
        password: { type: 'string', example: 'admin123' },
      },
    },
  })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }
}
