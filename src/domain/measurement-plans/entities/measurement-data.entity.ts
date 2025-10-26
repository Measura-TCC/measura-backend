import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type MeasurementDataDocument = MeasurementData & Document;

@Schema({ timestamps: true })
export class MeasurementData {
  @ApiProperty({ description: 'The unique identifier of the measurement data' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The ID of the measurement plan' })
  @Prop({ type: Types.ObjectId, ref: 'MeasurementPlan', required: true })
  planId: Types.ObjectId;

  @ApiProperty({ description: 'The ID of the measurement cycle' })
  @Prop({ type: Types.ObjectId, ref: 'MeasurementCycle', required: true })
  cycleId: Types.ObjectId;

  @ApiProperty({ description: 'The ID of the objective' })
  @Prop({ type: Types.ObjectId, required: true })
  objectiveId: Types.ObjectId;

  @ApiProperty({ description: 'The ID of the question' })
  @Prop({ type: Types.ObjectId, required: true })
  questionId: Types.ObjectId;

  @ApiProperty({ description: 'The ID of the metric' })
  @Prop({ type: Types.ObjectId, required: true })
  metricId: Types.ObjectId;

  @ApiProperty({ description: 'The ID of the measurement definition' })
  @Prop({ type: Types.ObjectId, required: true })
  measurementDefinitionId: Types.ObjectId;

  @ApiProperty({ description: 'The measured value' })
  @Prop({ required: true, type: Number })
  value: number;

  @ApiProperty({ description: 'The date when the measurement was taken' })
  @Prop({ required: true, type: Date })
  date: Date;

  @ApiProperty({ description: 'Optional notes about the measurement' })
  @Prop()
  notes?: string;

  @ApiProperty({ description: 'The ID of the user who created the data' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: 'The date when the data was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the data was last updated' })
  updatedAt: Date;
}

export const MeasurementDataSchema =
  SchemaFactory.createForClass(MeasurementData);

MeasurementDataSchema.index({ planId: 1, cycleId: 1 });
MeasurementDataSchema.index({ metricId: 1, date: -1 });
MeasurementDataSchema.index({ measurementDefinitionId: 1 });
MeasurementDataSchema.index({ cycleId: 1 });
