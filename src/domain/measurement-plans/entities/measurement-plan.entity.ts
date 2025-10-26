import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type MeasurementPlanDocument = MeasurementPlan & Document;

@Schema()
export class Measurement {
  @ApiProperty({ description: 'The unique identifier of the measurement' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The entity being measured', maxLength: 50 })
  @Prop({ required: true, maxlength: 50 })
  measurementEntity: string;

  @ApiProperty({ description: 'The acronym for the measurement', maxLength: 3 })
  @Prop({ required: true, maxlength: 3 })
  measurementAcronym: string;

  @ApiProperty({
    description: 'The properties of the measurement',
    maxLength: 200,
  })
  @Prop({ required: true, maxlength: 200 })
  measurementProperties: string;

  @ApiProperty({ description: 'The unit of measurement', maxLength: 50 })
  @Prop({ required: true, maxlength: 50 })
  measurementUnit: string;

  @ApiProperty({ description: 'The scale of measurement' })
  @Prop({ required: true })
  measurementScale: string;

  @ApiProperty({
    description: 'The procedure for measurement',
    maxLength: 1000,
  })
  @Prop({ required: true, maxlength: 1000 })
  measurementProcedure: string;

  @ApiProperty({ description: 'The frequency of measurement', maxLength: 50 })
  @Prop({ required: true, maxlength: 50 })
  measurementFrequency: string;

  @ApiProperty({
    description: 'The person responsible for measurement',
    maxLength: 255,
    required: false,
  })
  @Prop({ maxlength: 255 })
  measurementResponsible?: string;
}

@Schema()
export class Metric {
  @ApiProperty({ description: 'The unique identifier of the metric' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The name of the metric', maxLength: 50 })
  @Prop({ required: true, maxlength: 50 })
  metricName: string;

  @ApiProperty({ description: 'The description of the metric', maxLength: 400 })
  @Prop({ required: true, maxlength: 400 })
  metricDescription: string;

  @ApiProperty({ description: 'The mnemonic for the metric', maxLength: 10 })
  @Prop({ required: true, maxlength: 10 })
  metricMnemonic: string;

  @ApiProperty({ description: 'The formula for calculating the metric' })
  @Prop({ required: true })
  metricFormula: string;

  @ApiProperty({ description: 'The control range for the metric [min, max]' })
  @Prop({
    required: true,
    type: [Number],
    validate: {
      validator: (v: number[]) => Array.isArray(v) && v.length === 2,
      message: 'Control range must be an array of exactly 2 numbers',
    },
  })
  metricControlRange: [number, number];

  @ApiProperty({
    description: 'The analysis procedure for the metric',
    maxLength: 1000,
  })
  @Prop({ required: true, maxlength: 1000 })
  analysisProcedure: string;

  @ApiProperty({ description: 'The frequency of analysis', maxLength: 50 })
  @Prop({ required: true, maxlength: 50 })
  analysisFrequency: string;

  @ApiProperty({
    description: 'The person responsible for analysis',
    maxLength: 255,
    required: false,
  })
  @Prop({ maxlength: 255 })
  analysisResponsible?: string;

  @ApiProperty({
    description: 'The measurements for this metric',
    type: [Measurement],
  })
  @Prop({
    type: [Object],
    required: true,
    validate: {
      validator: (v: Measurement[]) => Array.isArray(v) && v.length >= 1,
      message: 'At least one measurement is required for each metric',
    },
  })
  measurements: Measurement[];
}

@Schema()
export class Question {
  @ApiProperty({ description: 'The unique identifier of the question' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The text of the question' })
  @Prop({ required: true })
  questionText: string;

  @ApiProperty({ description: 'The metrics for this question', type: [Metric] })
  @Prop({ type: [Object], default: [] })
  metrics: Metric[];
}

@Schema()
export class Objective {
  @ApiProperty({ description: 'The unique identifier of the objective' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The title of the objective' })
  @Prop({ required: true })
  objectiveTitle: string;

  @ApiProperty({
    description: 'The questions for this objective',
    type: [Question],
  })
  @Prop({ type: [Object], default: [] })
  questions: Question[];
}

export enum MeasurementPlanStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FINISHED = 'finished',
}

@Schema({ timestamps: true })
export class MeasurementPlan {
  @ApiProperty({ description: 'The unique identifier of the measurement plan' })
  _id: Types.ObjectId;

  @ApiProperty({
    description: 'The name of the measurement plan',
    maxLength: 255,
  })
  @Prop({ required: true, maxlength: 255 })
  planName: string;

  @ApiProperty({ description: 'The ID of the associated project' })
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  associatedProject: Types.ObjectId;

  @ApiProperty({
    description: 'The person responsible for the plan',
    maxLength: 255,
  })
  @Prop({ required: true, maxlength: 255 })
  planResponsible: string;

  @ApiProperty({ description: 'The ID of the organization' })
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @ApiProperty({
    description: 'The status of the plan',
    enum: MeasurementPlanStatus,
  })
  @Prop({
    type: String,
    enum: Object.values(MeasurementPlanStatus),
    default: MeasurementPlanStatus.DRAFT,
  })
  status: MeasurementPlanStatus;

  @ApiProperty({ description: 'The ID of the user who created the plan' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({
    description: 'The objectives for this plan',
    type: [Objective],
  })
  @Prop({ type: [Object], default: [] })
  objectives: Objective[];

  @ApiProperty({ description: 'The date when the plan was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the plan was last updated' })
  updatedAt: Date;
}

export const MeasurementPlanSchema =
  SchemaFactory.createForClass(MeasurementPlan);

// Add indexes for performance
MeasurementPlanSchema.index({ organizationId: 1 });
MeasurementPlanSchema.index({ associatedProject: 1 });
MeasurementPlanSchema.index({ createdBy: 1 });
MeasurementPlanSchema.index({ status: 1 });
MeasurementPlanSchema.index({ createdAt: -1 });
MeasurementPlanSchema.index({ organizationId: 1, status: 1 });
MeasurementPlanSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
MeasurementPlanSchema.index({ planName: 'text' });
