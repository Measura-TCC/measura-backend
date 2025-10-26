import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class ConfigureJiraDto {
  @ApiProperty({
    description: 'Jira domain (e.g., company.atlassian.net)',
    example: 'acme.atlassian.net',
  })
  @IsNotEmpty()
  @IsString()
  domain: string;

  @ApiProperty({
    description: 'Jira account email',
    example: 'admin@acme.com',
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Jira API token',
    example: 'ATATT3xFfGF0...',
  })
  @IsNotEmpty()
  @IsString()
  apiToken: string;

  @ApiProperty({
    description: 'Enable or disable integration',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
