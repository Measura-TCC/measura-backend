import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class CreateCycleDto {
  @ApiProperty({
    description: 'The name of the cycle',
    example: 'Ciclo 1',
  })
  @IsNotEmpty({ message: 'Cycle name is required' })
  @IsString({ message: 'Cycle name must be a string' })
  cycleName: string;

  @ApiProperty({
    description: 'The start date of the cycle',
    example: '2025-01-01T00:00:00Z',
  })
  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString({}, { message: 'Start date must be a valid ISO-8601 date' })
  startDate: string;

  @ApiProperty({
    description: 'The end date of the cycle',
    example: '2025-01-31T23:59:59Z',
  })
  @IsNotEmpty({ message: 'End date is required' })
  @IsDateString({}, { message: 'End date must be a valid ISO-8601 date' })
  endDate: string;
}

export class UpdateCycleDto {
  @ApiProperty({
    description: 'The name of the cycle',
    example: 'Ciclo 1',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Cycle name must be a string' })
  cycleName?: string;

  @ApiProperty({
    description: 'The start date of the cycle',
    example: '2025-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO-8601 date' })
  startDate?: string;

  @ApiProperty({
    description: 'The end date of the cycle',
    example: '2025-01-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO-8601 date' })
  endDate?: string;
}

export class CycleResponseDto {
  @ApiProperty({ description: 'The unique identifier of the cycle' })
  _id: string;

  @ApiProperty({ description: 'The ID of the measurement plan' })
  planId: string;

  @ApiProperty({ description: 'The name of the cycle' })
  cycleName: string;

  @ApiProperty({ description: 'The start date of the cycle' })
  startDate: Date;

  @ApiProperty({ description: 'The end date of the cycle' })
  endDate: Date;

  @ApiProperty({ description: 'The ID of the user who created the cycle' })
  createdBy: string;

  @ApiProperty({ description: 'The date when the cycle was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the cycle was last updated' })
  updatedAt: Date;
}
