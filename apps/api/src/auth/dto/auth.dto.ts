import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Escribe un correo válido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Escribe tu nombre' })
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Escribe un correo válido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Escribe tu contraseña' })
  password: string;
}

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class FacebookLoginDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
