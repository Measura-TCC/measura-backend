import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsDate,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '@domain/projects/entities/project.entity';

export class UpdateProjectObjectiveDto {
  @ApiProperty({
    description: 'The unique identifier of the objective (for updates)',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @ApiProperty({
    description: 'The title of the objective',
    example: 'Improve system performance',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'The description of the objective',
    example: 'Reduce page load times by 50% and improve user satisfaction',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description:
      'Array of organizational objective IDs this project objective is linked to',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  organizationalObjectiveIds?: string[];
}

export class UpdateProjectDto {
  @ApiProperty({
    description: 'The name of the project',
    example: 'Updated E-commerce Platform Redesign',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'The description of the project',
    example: 'Updated redesign description with new goals',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'The organization this project belongs to',
    example: '60a1e2c7b9b5a50d944b1e34',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'Organization ID must be a valid MongoDB ObjectId' })
  organizationId?: string;

  @ApiProperty({
    description: 'The status of the project',
    enum: ProjectStatus,
    example: ProjectStatus.IN_PROGRESS,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({
    description: 'The start date of the project',
    example: '2023-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: 'The expected end date of the project',
    example: '2023-07-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Project objectives',
    type: [UpdateProjectObjectiveDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProjectObjectiveDto)
  objectives?: UpdateProjectObjectiveDto[];

  @ApiProperty({
    description: 'ID of the associated measurement plan',
    example: '60a1e2c7b9b5a50d944b1e39',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  measurementPlanId?: string;

  @ApiProperty({
    description: 'ID of the associated FPA estimate',
    example: '60a1e2c7b9b5a50d944b1e40',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  estimateId?: string;
}
