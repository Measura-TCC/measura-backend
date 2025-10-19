import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CountType } from '@domain/fpa/entities/estimate.entity';
import { RequirementWithFpaDataDto } from './requirement/requirement-with-fpa-data.dto';

export class CreateEstimateDto {
  @ApiProperty({
    description: 'Name of the estimate',
    example: 'Customer Management System v2.0',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Detailed description of the estimate scope and objectives',
    example:
      'Function point analysis for the new customer management system including CRM integration and reporting features',
    minLength: 10,
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'Project identifier this estimate belongs to',
    example: 'PROJ-2024-001',
  })
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'The type of function point count being performed',
    enum: CountType,
    example: CountType.DEVELOPMENT_PROJECT,
  })
  @IsNotEmpty()
  @IsEnum(CountType)
  countType: CountType;

  @ApiProperty({
    description: 'Definition of the application boundary from user perspective',
    example:
      'The system includes all modules for customer management, order processing, and inventory tracking. Excludes external payment gateway and shipping systems.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  applicationBoundary: string;

  @ApiProperty({
    description:
      'Definition of what functionality will be counted and measured',
    example:
      'Count includes all new functionality for customer registration, profile management, order creation, and basic reporting. Excludes data migration and system integration.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  countingScope: string;

  @ApiProperty({
    description: 'Average daily working hours per person',
    example: 8,
    minimum: 1,
    maximum: 24,
    default: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  averageDailyWorkingHours?: number;

  @ApiProperty({
    description: 'Number of people working on the project',
    example: 4,
    minimum: 1,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(100)
  teamSize: number;

  @ApiProperty({
    description: 'Hourly rate in Brazilian Reais (BRL)',
    example: 150.0,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  hourlyRateBRL: number;

  @ApiProperty({
    description:
      'Productivity factor for effort estimation (hours per function point)',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  productivityFactor?: number;

  @ApiProperty({
    description:
      'RECOMMENDED: Requirements-first approach (IFPUG-compliant). Create estimate from classified requirements with complete FPA data.',
    type: [RequirementWithFpaDataDto],
    required: false,
    example: [
      {
        title: 'User login functionality',
        description: 'System must allow user authentication',
        source: 'jira',
        sourceReference: 'PROJ-123',
        componentType: 'EI',
        fpaData: {
          name: 'Login Transaction',
          description: 'User authentication transaction',
          fileTypesReferenced: 2,
          dataElementTypes: 8,
          primaryIntent: 'Authenticate users and create session',
          processingLogic:
            'Validate credentials, check account status, create session token',
        },
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementWithFpaDataDto)
  requirements?: RequirementWithFpaDataDto[];

  @ApiProperty({
    description:
      'DEPRECATED: Use requirements[] instead. Array of Internal Logical File identifiers to include in estimate.',
    type: [String],
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  internalLogicalFiles?: string[];

  @ApiProperty({
    description:
      'DEPRECATED: Use requirements[] instead. Array of External Interface File identifiers.',
    type: [String],
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  externalInterfaceFiles?: string[];

  @ApiProperty({
    description:
      'DEPRECATED: Use requirements[] instead. Array of External Input identifiers.',
    type: [String],
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  externalInputs?: string[];

  @ApiProperty({
    description:
      'DEPRECATED: Use requirements[] instead. Array of External Output identifiers.',
    type: [String],
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  externalOutputs?: string[];

  @ApiProperty({
    description:
      'DEPRECATED: Use requirements[] instead. Array of External Query identifiers.',
    type: [String],
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  externalQueries?: string[];

  @ApiProperty({
    description:
      'General System Characteristics values (14 values, each 0-5 range)',
    example: [3, 2, 4, 1, 3, 2, 3, 1, 2, 3, 2, 1, 2, 3],
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(14)
  @ArrayMaxSize(14)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(5, { each: true })
  generalSystemCharacteristics?: number[];

  @ApiProperty({
    description: 'Additional notes and comments about the estimate',
    example:
      'This estimate assumes standard complexity for all components. May need revision based on detailed requirements.',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
