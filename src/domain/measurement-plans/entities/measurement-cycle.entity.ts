import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type MeasurementCycleDocument = MeasurementCycle & Document;

@Schema({ timestamps: true })
export class MeasurementCycle {
  @ApiProperty({ description: 'The unique identifier of the cycle' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The ID of the measurement plan' })
  @Prop({ type: Types.ObjectId, ref: 'MeasurementPlan', required: true })
  planId: Types.ObjectId;

  @ApiProperty({ description: 'The name of the cycle' })
  @Prop({ required: true })
  cycleName: string;

  @ApiProperty({ description: 'The start date of the cycle' })
  @Prop({ required: true, type: Date })
  startDate: Date;

  @ApiProperty({ description: 'The end date of the cycle' })
  @Prop({ required: true, type: Date })
  endDate: Date;

  @ApiProperty({ description: 'The ID of the user who created the cycle' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: 'The date when the cycle was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the cycle was last updated' })
  updatedAt: Date;
}

export const MeasurementCycleSchema =
  SchemaFactory.createForClass(MeasurementCycle);

MeasurementCycleSchema.index({ planId: 1, startDate: 1 });
MeasurementCycleSchema.index({ planId: 1, cycleName: 1 }, { unique: true });
