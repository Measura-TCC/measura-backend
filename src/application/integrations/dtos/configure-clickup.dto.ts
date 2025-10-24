import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class ConfigureClickUpDto {
  @ApiProperty({
    description: 'ClickUp API token',
    example: 'pk_xxxxxxxxxxxxxxxxxxxx',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Enable or disable integration',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
