import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsString, IsObject, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExportFormat {
  PDF = 'pdf',
  DOCX = 'docx',
}

// Individual chart image DTO
export class ChartImageDto {
  @ApiProperty({
    description: 'Unique identifier for the chart',
    example: 'metric-calculations-overview',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Base64 encoded image data with data URI prefix',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  data: string;

  @ApiProperty({
    description: 'Chart width in pixels',
    example: 1200,
  })
  @IsNumber()
  width: number;

  @ApiProperty({
    description: 'Chart height in pixels',
    example: 600,
  })
  @IsNumber()
  height: number;
}

// Cycle summary DTO
export interface CycleDto {
  _id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  measurementCount: number;
  status?: string;
}

// Measurement data DTO
export interface MeasurementDataDto {
  metricId: string;
  metricName: string;
  metricMnemonic: string;
  value: number;
  unit: string;
  collectedAt: Date;
  cycleId: string;
  cycleName: string;
}

// Metric calculation DTO
export interface MetricCalculationDto {
  metricId: string;
  metricName: string;
  metricMnemonic: string;
  cycleId: string;
  cycleName: string;
  calculatedValue: number;
  formula: string;
}

export class ExportOptionsDto {
  @ApiProperty({
    description: 'Include detailed descriptions and procedures',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include details must be a boolean' })
  includeDetails?: boolean;

  @ApiProperty({
    description: 'Include measurements section',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include measurements must be a boolean' })
  includeMeasurements?: boolean;

  @ApiProperty({
    description: 'Include analysis procedures',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include analysis must be a boolean' })
  includeAnalysis?: boolean;

  @ApiProperty({
    description: 'Include measurement cycles information',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include cycles must be a boolean' })
  includeCycles?: boolean;

  @ApiProperty({
    description: 'Include monitoring data (measurement values per cycle)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include monitoring must be a boolean' })
  includeMonitoring?: boolean;

  @ApiProperty({
    description: 'Include metric calculations per cycle',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include calculations must be a boolean' })
  includeCalculations?: boolean;

  @ApiProperty({
    description: 'Include charts from frontend',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include charts must be a boolean' })
  includeCharts?: boolean;
}

export class ExportMeasurementPlanDto {
  @ApiProperty({
    description: 'The format to export the plan in',
    enum: ExportFormat,
    example: ExportFormat.PDF,
  })
  @IsNotEmpty({ message: 'Export format is required' })
  @IsEnum(ExportFormat, { message: 'Format must be pdf or docx' })
  format: ExportFormat;

  @ApiProperty({
    description: 'Language code for export labels (en or pt)',
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Locale must be a string' })
  locale?: string;

  @ApiProperty({
    description: 'Export options',
    type: ExportOptionsDto,
    required: false,
  })
  @IsOptional()
  options?: ExportOptionsDto;

  @ApiProperty({
    description: 'Array of chart images to include in the export',
    type: [ChartImageDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Chart images must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ChartImageDto)
  chartImages?: ChartImageDto[];
}

export class ExportResponseDto {
  @ApiProperty({
    description: 'The URL to download the exported file',
    example: 'https://api.measura.com/exports/measurement-plan-123.pdf',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'The filename of the exported file',
    example: 'measurement-plan-123.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'The expiration date of the download link',
    example: '2024-01-02T10:30:00.000Z',
  })
  expiresAt: string;
}
