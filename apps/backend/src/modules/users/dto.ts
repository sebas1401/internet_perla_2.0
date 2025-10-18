import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from './user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;
  @IsString()
  @MinLength(6)
  password: string;
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateUserDto extends RegisterDto {
  @IsEnum(Role)
  role: Role;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
  @IsOptional()
  @IsString()
  name?: string;
}

