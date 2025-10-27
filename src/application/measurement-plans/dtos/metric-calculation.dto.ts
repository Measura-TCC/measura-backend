import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AggregationCall {
  @ApiProperty({ description: 'The aggregation function name (sum, avg, count, min, max)' })
  function: string;

  @ApiProperty({ description: 'The measurement acronym' })
  acronym: string;

  @ApiProperty({ description: 'The full match string (e.g., "sum(ESF_H)")' })
  fullMatch: string;
}

export class MeasurementWithAcronymDto {
  @ApiProperty({ description: 'The unique identifier of the measurement definition' })
  measurementDefinitionId: string;

  @ApiProperty({ description: 'The acronym for the measurement' })
  measurementAcronym: string;

  @ApiProperty({ description: 'The entity being measured' })
  measurementEntity: string;

  @ApiProperty({
    description: 'The collected measurement values',
    type: [Object],
  })
  collectedValues: {
    _id: string;
    value: number;
    date: Date;
    notes?: string;
  }[];
}

export class CycleMeasurementsResponseDto {
  @ApiProperty({ description: 'The unique identifier of the metric' })
  metricId: string;

  @ApiProperty({ description: 'The name of the metric' })
  metricName: string;

  @ApiProperty({ description: 'The formula for the metric' })
  metricFormula: string;

  @ApiProperty({
    description: 'The cycle information',
    type: Object,
  })
  cycle: {
    _id: string;
    cycleName: string;
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({
    description: 'Measurements grouped by acronym',
    type: [MeasurementWithAcronymDto],
  })
  measurements: MeasurementWithAcronymDto[];
}

export class MetricCalculationResultDto {
  @ApiProperty({ description: 'The name of the metric' })
  metricName: string;

  @ApiProperty({ description: 'The formula for calculating the metric' })
  metricFormula: string;

  @ApiProperty({
    description: 'The calculated metric value (can be null if division by zero)',
    nullable: true,
  })
  calculatedValue: number | null;

  @ApiProperty({
    description: 'The variable values used in the calculation',
    type: Object,
    example: { 'sum(ESF_H)': 75, 'sum(PFD)': 10 },
  })
  variables: Record<string, number>;

  @ApiProperty({
    description: 'The cycle information',
    type: Object,
  })
  cycle: {
    _id: string;
    cycleName: string;
  };
}

export class FormulaValidationDto {
  @ApiProperty({ description: 'Whether the formula is valid' })
  valid: boolean;

  @ApiProperty({
    description: 'List of errors found in the formula',
    required: false,
    type: [String],
  })
  errors?: string[];

  @ApiProperty({
    description: 'Suggestions for fixing the formula',
    required: false,
    type: [String],
  })
  suggestions?: string[];
}

export class ValidateFormulaDto {
  @ApiProperty({
    description: 'The metric formula to validate',
    example: 'PRODUCTIVITY = sum(ESF_H) / nullIf(sum(PFD), 0)',
  })
  @IsNotEmpty({ message: 'Formula is required' })
  @IsString({ message: 'Formula must be a string' })
  formula: string;
}
