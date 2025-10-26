import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateIntegrationDto {
  @ApiProperty({
    description: 'Enable or disable integration',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
