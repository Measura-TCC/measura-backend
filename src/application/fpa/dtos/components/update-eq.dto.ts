import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateEQDto {
  @ApiProperty({
    description: 'Name of the External Query transaction',
    example: 'Customer Information Lookup',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Detailed description of the EQ transaction',
    example:
      'Query transaction that allows users to search and retrieve customer information by various criteria',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description:
      'Number of File Types Referenced (FTRs/ARs) - Referenced Files',
    example: 2,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  fileTypesReferenced?: number;

  @ApiProperty({
    description: 'Number of Data Element Types (DETs/TDs) - Types of Data',
    example: 18,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  dataElementTypes?: number;

  // Special EQ calculation fields
  @ApiProperty({
    description:
      'Number of File Types Referenced for input parameters (special EQ calculation)',
    example: 1,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  inputFtr?: number;

  @ApiProperty({
    description:
      'Number of Data Element Types for input parameters (special EQ calculation)',
    example: 5,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  inputDet?: number;

  @ApiProperty({
    description:
      'Number of File Types Referenced for output data (special EQ calculation)',
    example: 3,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  outputFtr?: number;

  @ApiProperty({
    description:
      'Number of Data Element Types for output data (special EQ calculation)',
    example: 12,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  outputDet?: number;

  @ApiProperty({
    description: 'Primary business purpose of this External Query transaction',
    example:
      'Allows users to search and retrieve customer information by ID, name, or email',
    required: false,
  })
  @IsString()
  @IsOptional()
  primaryIntent?: string;

  @ApiProperty({
    description: 'Search criteria and retrieval logic description',
    example:
      'Searches customer database using multiple criteria, applies security filters, returns formatted results',
    required: false,
  })
  @IsString()
  @IsOptional()
  retrievalLogic?: string;

  @ApiProperty({
    description: 'Output format and data presentation details',
    example:
      'Returns customer details in JSON format with contact information, account status, and recent activity',
    required: false,
  })
  @IsString()
  @IsOptional()
  outputFormat?: string;

  @ApiProperty({
    description:
      'Additional technical notes about query performance, caching, or special requirements',
    example:
      'Implements caching for frequently accessed records, includes pagination for large result sets',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
