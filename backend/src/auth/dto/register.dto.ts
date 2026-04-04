import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { CompanyType } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsEnum(CompanyType)
  companyType!: CompanyType;
}
