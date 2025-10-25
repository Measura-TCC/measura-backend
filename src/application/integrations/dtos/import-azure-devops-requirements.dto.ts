import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId, IsOptional, IsBoolean } from 'class-validator';

export class ImportAzureDevOpsRequirementsDto {
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
    description: 'Estimate ID (optional when preview=true)',
    example: '68f45221568697b82b8ea111',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  estimateId?: string;

  @ApiProperty({
    description: 'Azure DevOps project name',
    example: 'MainApp',
  })
  @IsNotEmpty()
  @IsString()
  project: string;

  @ApiProperty({
    description: 'WIQL query string',
    example: 'SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = \'Active\'',
  })
  @IsNotEmpty()
  @IsString()
  wiql: string;

  @ApiProperty({
    description: 'Preview mode - fetch requirements without saving to database',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}
