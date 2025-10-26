import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MeasurementData,
  MeasurementDataDocument,
} from '@domain/measurement-plans/entities/measurement-data.entity';

@Injectable()
export class MeasurementDataRepository {
  private readonly logger = new Logger(MeasurementDataRepository.name);

  constructor(
    @InjectModel(MeasurementData.name)
    private readonly dataModel: Model<MeasurementDataDocument>,
  ) {}

  async create(data: Partial<MeasurementData>): Promise<MeasurementData> {
    const createdData = new this.dataModel(data);
    const saved = await createdData.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<MeasurementData | null> {
    return this.dataModel.findById(id).lean().exec();
  }

  async findByCycleId(cycleId: string): Promise<MeasurementData[]> {
    return this.dataModel
      .find({ cycleId: new Types.ObjectId(cycleId) })
      .lean()
      .exec();
  }

  async findByPlanId(planId: string): Promise<MeasurementData[]> {
    return this.dataModel
      .find({ planId: new Types.ObjectId(planId) })
      .lean()
      .exec();
  }

  async findByMetricId(metricId: string): Promise<MeasurementData[]> {
    return this.dataModel
      .find({ metricId: new Types.ObjectId(metricId) })
      .sort({ date: -1 })
      .lean()
      .exec();
  }

  async update(
    id: string,
    data: Partial<MeasurementData>,
  ): Promise<MeasurementData | null> {
    return this.dataModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.dataModel.findByIdAndDelete(id).exec();
  }

  async countByCycleId(cycleId: string): Promise<number> {
    return this.dataModel
      .countDocuments({ cycleId: new Types.ObjectId(cycleId) })
      .exec();
  }
}
