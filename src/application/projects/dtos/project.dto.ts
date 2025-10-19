import { ApiProperty } from '@nestjs/swagger';
import {
  ProjectStatus,
  ProjectObjective,
} from '@domain/projects/entities/project.entity';
import { Type } from 'class-transformer';
import { UserDto } from '@application/users/dtos/user.dto';

export class ProjectDto {
  @ApiProperty({
    description: 'The unique identifier of the project',
    example: '60a1e2c7b9b5a50d944b1e37',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the project',
    example: 'E-commerce Platform Redesign',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the project',
    example:
      'Redesign the e-commerce platform to improve user experience and conversion rates',
  })
  description: string;

  @ApiProperty({
    description: 'The user who created the project',
    type: UserDto,
  })
  @Type(() => UserDto)
  createdBy: UserDto;

  @ApiProperty({
    description: 'The status of the project',
    enum: ProjectStatus,
    example: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @ApiProperty({
    description: 'The start date of the project',
    example: '2023-01-01T00:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'The expected end date of the project',
    example: '2023-06-30T00:00:00.000Z',
  })
  endDate: Date;

  @ApiProperty({
    description: 'The date when the project was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the project was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Project objectives linked to organizational objectives',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Improve system performance' },
        description: {
          type: 'string',
          example: 'Optimize database queries and reduce response time by 30%',
        },
        organizationalObjectiveIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['60a1e2c7b9b5a50d944b1e37', '60a1e2c7b9b5a50d944b1e38'],
        },
      },
    },
    required: false,
  })
  objectives?: ProjectObjective[];

  @ApiProperty({
    description: 'ID of the associated measurement plan, if any',
    example: '60a1e2c7b9b5a50d944b1e39',
    required: false,
  })
  measurementPlanId?: string;

  @ApiProperty({
    description: 'ID of the associated FPA estimate, if any',
    example: '60a1e2c7b9b5a50d944b1e40',
    required: false,
  })
  estimateId?: string;

  constructor(partial: Partial<ProjectDto>) {
    Object.assign(this, partial);
  }
}
