import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId, IsOptional, IsBoolean } from 'class-validator';

export class ImportClickUpRequirementsDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '68c8750f70b5c520bf74c6d7',
  })
  @IsNotEmpty()
  @IsMongoId()
  organizationId: string;

  @ApiProperty({
    description: 'Project ID',
    example: '68c8757170b5c520bf74c6fd',
  })
  @IsNotEmpty()
  @IsMongoId()
  projectId: string;

  @ApiProperty({
    description: 'Estimate ID',
    example: '68f45221568697b82b8ea111',
  })
  @IsNotEmpty()
  @IsMongoId()
  estimateId: string;

  @ApiProperty({
    description: 'ClickUp list ID',
    example: '901234567890',
  })
  @IsNotEmpty()
  @IsString()
  listId: string;

  @ApiProperty({
    description: 'Include closed tasks',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeClosed?: boolean;
}
