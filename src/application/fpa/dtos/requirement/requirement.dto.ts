import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RequirementDto {
  @ApiProperty({
    description: 'The unique identifier of the requirement',
    example: '60a1e2c7b9b5a50d944b1e50',
  })
  id: string;

  @ApiProperty({
    description: 'Title of the requirement',
    example: 'User login functionality',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed description of the requirement',
    example: 'System must allow user authentication via email and password',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Source of the requirement',
    enum: ['manual', 'csv', 'jira', 'github', 'azure_devops', 'clickup'],
    example: 'jira',
  })
  source: string;

  @ApiProperty({
    description: 'External reference ID',
    example: 'PROJ-123',
    required: false,
  })
  sourceReference?: string;

  @ApiProperty({
    description: 'FPA component type classification',
    enum: ['ALI', 'AIE', 'EI', 'EO', 'EQ'],
    example: 'EI',
    required: false,
  })
  componentType?: string;

  @ApiProperty({
    description: 'ID of the FPA component created from this requirement',
    example: '60a1e2c7b9b5a50d944b1e51',
    required: false,
  })
  componentId?: string;

  @ApiProperty({
    description: 'The estimate this requirement belongs to',
    example: '60a1e2c7b9b5a50d944b1e48',
  })
  estimateId: string;

  @ApiProperty({
    description: 'The date when the requirement was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the requirement was last updated',
    example: '2023-01-15T00:00:00.000Z',
  })
  @Type(() => Date)
  updatedAt: Date;

  constructor(partial: Partial<RequirementDto>) {
    Object.assign(this, partial);
  }
}
