import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}

