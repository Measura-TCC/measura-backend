import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsMongoId,
} from 'class-validator';

export class CreateMeasurementDataDto {
  @ApiProperty({
    description: 'The ID of the cycle',
    example: '68f45221568697b82b8ea000',
  })
  @IsNotEmpty({ message: 'Cycle ID is required' })
  @IsMongoId({ message: 'Cycle ID must be a valid MongoDB ObjectId' })
  cycleId: string;

  @ApiProperty({
    description: 'The ID of the measurement definition',
    example: '68f45221568697b82b8ea001',
  })
  @IsNotEmpty({ message: 'Measurement definition ID is required' })
  @IsMongoId({
    message: 'Measurement definition ID must be a valid MongoDB ObjectId',
  })
  measurementDefinitionId: string;

  @ApiProperty({
    description: 'The measured value',
    example: 85.5,
  })
  @IsNotEmpty({ message: 'Value is required' })
  @IsNumber({}, { message: 'Value must be a number' })
  value: number;

  @ApiProperty({
    description: 'The date when the measurement was taken',
    example: '2025-01-15T10:30:00Z',
  })
  @IsNotEmpty({ message: 'Date is required' })
  @IsDateString({}, { message: 'Date must be a valid ISO-8601 date' })
  date: string;

  @ApiProperty({
    description: 'Optional notes about the measurement',
    example: 'Baseline measurement after sprint 1',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

export class UpdateMeasurementDataDto {
  @ApiProperty({
    description: 'The measured value',
    example: 87.3,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Value must be a number' })
  value?: number;

  @ApiProperty({
    description: 'The date when the measurement was taken',
    example: '2025-01-16T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date must be a valid ISO-8601 date' })
  date?: string;

  @ApiProperty({
    description: 'Optional notes about the measurement',
    example: 'Updated after code review',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

export class MeasurementDataResponseDto {
  @ApiProperty({ description: 'The unique identifier of the measurement data' })
  _id: string;

  @ApiProperty({ description: 'The ID of the measurement plan' })
  planId: string;

  @ApiProperty({ description: 'The ID of the measurement cycle' })
  cycleId: string;

  @ApiProperty({ description: 'The ID of the objective' })
  objectiveId: string;

  @ApiProperty({ description: 'The ID of the question' })
  questionId: string;

  @ApiProperty({ description: 'The ID of the metric' })
  metricId: string;

  @ApiProperty({ description: 'The ID of the measurement definition' })
  measurementDefinitionId: string;

  @ApiProperty({ description: 'The measured value' })
  value: number;

  @ApiProperty({ description: 'The date when the measurement was taken' })
  date: Date;

  @ApiProperty({ description: 'Optional notes about the measurement' })
  notes?: string;

  @ApiProperty({ description: 'The ID of the user who created the data' })
  createdBy: string;

  @ApiProperty({ description: 'The date when the data was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the data was last updated' })
  updatedAt: Date;
}

export class MeasurementWithContextDto {
  @ApiProperty({ description: 'The unique identifier of the measurement data' })
  _id: string;

  @ApiProperty({ description: 'The name of the measurement definition' })
  measurementDefinitionName: string;

  @ApiProperty({ description: 'The acronym of the measurement' })
  measurementAcronym: string;

  @ApiProperty({ description: 'The name of the metric' })
  metricName: string;

  @ApiProperty({ description: 'The title of the objective' })
  objectiveTitle: string;

  @ApiProperty({ description: 'The text of the question' })
  questionText: string;

  @ApiProperty({ description: 'The measured value' })
  value: number;

  @ApiProperty({ description: 'The date when the measurement was taken' })
  date: Date;

  @ApiProperty({ description: 'Optional notes about the measurement' })
  notes?: string;
}

export class CycleWithMeasurementsDto {
  @ApiProperty({ description: 'The cycle information' })
  cycle: {
    _id: string;
    cycleName: string;
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({
    description: 'The measurements in this cycle',
    type: [MeasurementWithContextDto],
  })
  measurements: MeasurementWithContextDto[];

  @ApiProperty({ description: 'The count of measurements in this cycle' })
  measurementCount: number;
}

export class MetricStatusDto {
  @ApiProperty({
    description: 'The status of the metric',
    enum: ['OK', 'NEEDS_ATTENTION'],
  })
  status: 'OK' | 'NEEDS_ATTENTION';

  @ApiProperty({ description: 'Count of measurements within control range' })
  withinRange: number;

  @ApiProperty({ description: 'Count of measurements outside control range' })
  outOfRange: number;

  @ApiProperty({ description: 'Total number of measurements' })
  totalMeasurements: number;

  @ApiProperty({ description: 'The control range [min, max]' })
  controlRange: [number, number];

  @ApiProperty({
    description: 'The most recent measurement value',
    required: false,
  })
  latestValue?: number;
}

export class PlanStatusDto {
  @ApiProperty({
    description: 'The overall status of the plan',
    enum: ['OK', 'NEEDS_ATTENTION'],
  })
  overallStatus: 'OK' | 'NEEDS_ATTENTION';

  @ApiProperty({ description: 'Count of metrics with status OK' })
  metricsOk: number;

  @ApiProperty({ description: 'Count of metrics that need attention' })
  metricsNeedAttention: number;

  @ApiProperty({ description: 'Total number of metrics' })
  totalMetrics: number;
}
