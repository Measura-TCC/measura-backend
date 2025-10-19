import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type RequirementDocument = Requirement & Document;

export type RequirementSource =
  | 'manual'
  | 'csv'
  | 'jira'
  | 'github'
  | 'azure_devops'
  | 'clickup';

export type FPAComponentType = 'ALI' | 'AIE' | 'EI' | 'EO' | 'EQ';

@Schema({ timestamps: true })
export class Requirement {
  @ApiProperty({ description: 'The unique identifier of the requirement' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'Title of the requirement' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({
    description: 'Detailed description of the requirement',
    required: false,
  })
  @Prop()
  description?: string;

  @ApiProperty({
    description: 'Source of the requirement (manual, Jira, GitHub, etc.)',
    enum: ['manual', 'csv', 'jira', 'github', 'azure_devops', 'clickup'],
  })
  @Prop({ type: String, required: true })
  source: RequirementSource;

  @ApiProperty({
    description:
      'External reference ID (e.g., Jira ticket number, GitHub issue number)',
    required: false,
  })
  @Prop()
  sourceReference?: string;

  @ApiProperty({
    description: 'Additional metadata from the source system',
    required: false,
  })
  @Prop({ type: Object })
  sourceMetadata?: Record<string, any>;

  @ApiProperty({
    description: 'FPA component type classification',
    enum: ['ALI', 'AIE', 'EI', 'EO', 'EQ'],
    required: false,
  })
  @Prop({ type: String })
  componentType?: FPAComponentType;

  @ApiProperty({ description: 'The estimate this requirement belongs to' })
  @Prop({ type: Types.ObjectId, ref: 'Estimate', required: true })
  estimateId: Types.ObjectId;

  @ApiProperty({
    description: 'The organization this requirement belongs to',
  })
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @ApiProperty({ description: 'The project this requirement belongs to' })
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @ApiProperty({
    description:
      'The FPA component created from this requirement (for traceability)',
    required: false,
  })
  @Prop({ type: Types.ObjectId })
  componentId?: Types.ObjectId;

  @ApiProperty({ description: 'The date when the requirement was created' })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the requirement was last updated',
  })
  updatedAt: Date;
}

export const RequirementSchema = SchemaFactory.createForClass(Requirement);

// Add indexes for performance
RequirementSchema.index({ estimateId: 1 });
RequirementSchema.index({ componentId: 1 });
RequirementSchema.index({ organizationId: 1 });
RequirementSchema.index({ source: 1, sourceReference: 1 });
