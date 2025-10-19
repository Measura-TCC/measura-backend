import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ProjectDocument = Project & Document;

export interface ProjectObjective {
  _id: Types.ObjectId;
  title: string;
  description: string;
  organizationalObjectiveIds: Types.ObjectId[]; // Links to organizational objectives
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

@Schema({ timestamps: true })
export class Project {
  @ApiProperty({ description: 'The unique identifier of the project' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The name of the project' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'The description of the project' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ description: 'The ID of the user who created the project' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: 'The status of the project' })
  @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status: ProjectStatus;

  @ApiProperty({ description: 'The start date of the project' })
  @Prop()
  startDate: Date;

  @ApiProperty({ description: 'The expected end date of the project' })
  @Prop()
  endDate: Date;

  @ApiProperty({ description: 'The organization this project belongs to' })
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @ApiProperty({ description: 'The project objectives', type: [Object] })
  @Prop({ type: [Object], default: [] })
  objectives: ProjectObjective[];

  @ApiProperty({
    description: 'The measurement plan associated with this project',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'MeasurementPlan' })
  measurementPlanId?: Types.ObjectId;

  @ApiProperty({
    description: 'The estimate associated with this project',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Estimate' })
  estimateId?: Types.ObjectId;

  @ApiProperty({ description: 'The date when the project was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the project was last updated' })
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Add indexes for performance
ProjectSchema.index({ organizationId: 1 });
ProjectSchema.index({ measurementPlanId: 1 });
ProjectSchema.index({ estimateId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ createdBy: 1 });
