import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class ConfigureAzureDevOpsDto {
  @ApiProperty({
    description: 'Azure DevOps organization name',
    example: 'acme-corp',
  })
  @IsNotEmpty()
  @IsString()
  organization: string;

  @ApiProperty({
    description: 'Azure DevOps personal access token',
    example: 'xxxxxxxxxxxxxxxxxxxx',
  })
  @IsNotEmpty()
  @IsString()
  pat: string;

  @ApiProperty({
    description: 'Enable or disable integration',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
