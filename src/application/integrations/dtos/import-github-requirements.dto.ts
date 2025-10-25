import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class ImportGitHubRequirementsDto {
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
    description: 'GitHub repository owner',
    example: 'acme-corp',
  })
  @IsNotEmpty()
  @IsString()
  owner: string;

  @ApiProperty({
    description: 'GitHub repository name',
    example: 'main-app',
  })
  @IsNotEmpty()
  @IsString()
  repo: string;

  @ApiProperty({
    description: 'Issue state filter',
    example: 'all',
    enum: ['open', 'closed', 'all'],
    default: 'all',
  })
  @IsNotEmpty()
  @IsEnum(['open', 'closed', 'all'])
  state: 'open' | 'closed' | 'all';

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
