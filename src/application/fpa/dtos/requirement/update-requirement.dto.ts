import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateRequirementDto {
  @ApiProperty({
    description: 'Title of the requirement',
    example: 'User login functionality',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Detailed description of the requirement',
    example: 'System must allow user authentication via email and password',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Source of the requirement',
    enum: ['manual', 'csv', 'jira', 'github', 'azure_devops', 'clickup'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['manual', 'csv', 'jira', 'github', 'azure_devops', 'clickup'])
  source?: 'manual' | 'csv' | 'jira' | 'github' | 'azure_devops' | 'clickup';

  @ApiProperty({
    description: 'External reference ID (e.g., JIRA-123, GitHub #45)',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceReference?: string;

  @ApiProperty({
    description: 'FPA component type classification',
    enum: ['ALI', 'AIE', 'EI', 'EO', 'EQ'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ALI', 'AIE', 'EI', 'EO', 'EQ'])
  componentType?: 'ALI' | 'AIE' | 'EI' | 'EO' | 'EQ';
}
