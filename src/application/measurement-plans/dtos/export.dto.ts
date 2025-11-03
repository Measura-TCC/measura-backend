import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';

export enum ExportFormat {
  PDF = 'pdf',
  DOCX = 'docx',
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
