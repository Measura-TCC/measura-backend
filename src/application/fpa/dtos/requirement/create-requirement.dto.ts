import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateRequirementDto {
  @ApiProperty({
    description: 'Title of the requirement',
    example: 'User login functionality',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

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
    example: 'manual',
    default: 'manual',
  })
  @IsNotEmpty()
  @IsEnum(['manual', 'csv', 'jira', 'github', 'azure_devops', 'clickup'])
  source: 'manual' | 'csv' | 'jira' | 'github' | 'azure_devops' | 'clickup';

  @ApiProperty({
    description: 'External reference ID (e.g., JIRA-123, GitHub #45)',
    example: 'PROJ-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceReference?: string;
}
