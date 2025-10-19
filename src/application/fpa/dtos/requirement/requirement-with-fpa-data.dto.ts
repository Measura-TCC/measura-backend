import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateALIDto } from '../create-ali.dto';
import { CreateEIDto } from '../create-ei.dto';
import { CreateEODto } from '../create-eo.dto';
import { CreateEQDto } from '../create-eq.dto';
import { CreateAIEDto } from '../create-aie.dto';

export class RequirementWithFpaDataDto {
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
    example: 'jira',
  })
  @IsNotEmpty()
  @IsEnum(['manual', 'csv', 'jira', 'github', 'azure_devops', 'clickup'])
  source: 'manual' | 'csv' | 'jira' | 'github' | 'azure_devops' | 'clickup';

  @ApiProperty({
    description:
      'External reference ID (e.g., JIRA-123, GitHub #45, Azure DevOps 789)',
    example: 'PROJ-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceReference?: string;

  @ApiProperty({
    description: 'FPA component type classification',
    enum: ['ALI', 'AIE', 'EI', 'EO', 'EQ'],
    example: 'EI',
  })
  @IsNotEmpty()
  @IsEnum(['ALI', 'AIE', 'EI', 'EO', 'EQ'])
  componentType: 'ALI' | 'AIE' | 'EI' | 'EO' | 'EQ';

  @ApiProperty({
    description:
      'FPA component data - structure depends on componentType. Use CreateALIDto for ALI, CreateEIDto for EI, etc.',
    oneOf: [
      { $ref: '#/components/schemas/CreateALIDto' },
      { $ref: '#/components/schemas/CreateAIEDto' },
      { $ref: '#/components/schemas/CreateEIDto' },
      { $ref: '#/components/schemas/CreateEODto' },
      { $ref: '#/components/schemas/CreateEQDto' },
    ],
    example: {
      name: 'Login Transaction',
      description: 'User authentication transaction',
      fileTypesReferenced: 2,
      dataElementTypes: 8,
      primaryIntent: 'Authenticate users and create session',
      processingLogic:
        'Validate credentials, check account status, create session token',
    },
  })
  @IsNotEmpty()
  fpaData: CreateALIDto | CreateAIEDto | CreateEIDto | CreateEODto | CreateEQDto;
}
