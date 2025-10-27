import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMeasurementDto {
  @ApiProperty({
    description: 'The entity being measured',
    example: 'Test Suite',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Measurement entity is required' })
  @IsString({ message: 'Measurement entity must be a string' })
  @MaxLength(50, {
    message: 'Measurement entity must not exceed 50 characters',
  })
  measurementEntity: string;

  @ApiProperty({
    description: 'The acronym for the measurement',
    example: 'TS',
    maxLength: 20,
  })
  @IsNotEmpty({ message: 'Measurement acronym is required' })
  @IsString({ message: 'Measurement acronym must be a string' })
  @MaxLength(20, { message: 'Measurement acronym must not exceed 20 characters' })
  measurementAcronym: string;

  @ApiProperty({
    description: 'The properties of the measurement',
    example: 'Lines of code covered',
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'Measurement properties are required' })
  @IsString({ message: 'Measurement properties must be a string' })
  @MaxLength(200, {
    message: 'Measurement properties must not exceed 200 characters',
  })
  measurementProperties: string;

  @ApiProperty({
    description: 'The unit of measurement',
    example: 'Percentage',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Measurement unit is required' })
  @IsString({ message: 'Measurement unit must be a string' })
  @MaxLength(50, { message: 'Measurement unit must not exceed 50 characters' })
  measurementUnit: string;

  @ApiProperty({
    description: 'The scale of measurement',
    example: 'Ratio',
  })
  @IsNotEmpty({ message: 'Measurement scale is required' })
  @IsString({ message: 'Measurement scale must be a string' })
  measurementScale: string;

  @ApiProperty({
    description: 'The procedure for measurement',
    example: 'Automated via coverage tools',
    maxLength: 1000,
  })
  @IsNotEmpty({ message: 'Measurement procedure is required' })
  @IsString({ message: 'Measurement procedure must be a string' })
  @MaxLength(1000, {
    message: 'Measurement procedure must not exceed 1000 characters',
  })
  measurementProcedure: string;

  @ApiProperty({
    description: 'The frequency of measurement',
    example: 'Daily',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Measurement frequency is required' })
  @IsString({ message: 'Measurement frequency must be a string' })
  @MaxLength(50, {
    message: 'Measurement frequency must not exceed 50 characters',
  })
  measurementFrequency: string;

  @ApiProperty({
    description: 'The person responsible for measurement',
    example: 'CI/CD Pipeline',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Measurement responsible must be a string' })
  @MaxLength(255, {
    message: 'Measurement responsible must not exceed 255 characters',
  })
  measurementResponsible?: string;
}

export class UpdateMeasurementDto extends CreateMeasurementDto {}
