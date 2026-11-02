import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Authenticated, CurrentUser, type AuthUser } from './auth.guard';
import { AuthService } from './auth.service';
import {
  FacebookLoginDto,
  GoogleLoginDto,
  LoginDto,
  RegisterDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('google')
  @HttpCode(200)
  google(@Body() dto: GoogleLoginDto) {
    return this.auth.loginWithGoogle(dto.idToken);
  }

  @Post('facebook')
  @HttpCode(200)
  facebook(@Body() dto: FacebookLoginDto) {
    return this.auth.loginWithFacebook(dto.accessToken);
  }

  @Get('me')
  @Authenticated()
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
