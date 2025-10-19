import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsDate,
  IsArray,
  ArrayMaxSize,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectObjectiveDto {
  @ApiProperty({
    description: 'The title of the objective',
    example: 'Improve system performance',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'The description of the objective',
    example: 'Reduce page load times by 50% and improve user satisfaction',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

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

export class CreateProjectDto {
  @ApiProperty({
    description: 'The name of the project',
    example: 'E-commerce Platform Redesign',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'The description of the project',
    example:
      'Redesign the e-commerce platform to improve user experience and conversion rates',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'The organization this project belongs to',
    example: '60a1e2c7b9b5a50d944b1e34',
  })
  @IsNotEmpty()
  @IsMongoId({ message: 'Organization ID must be a valid MongoDB ObjectId' })
  organizationId: string;

  @ApiProperty({
    description: 'The start date of the project',
    example: '2023-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: 'The expected end date of the project',
    example: '2023-06-30T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Project objectives',
    type: [CreateProjectObjectiveDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectObjectiveDto)
  objectives?: CreateProjectObjectiveDto[];
}
