import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MeasurementCycle,
  MeasurementCycleDocument,
} from '@domain/measurement-plans/entities/measurement-cycle.entity';

@Injectable()
export class MeasurementCycleRepository {
  private readonly logger = new Logger(MeasurementCycleRepository.name);

  constructor(
    @InjectModel(MeasurementCycle.name)
    private readonly cycleModel: Model<MeasurementCycleDocument>,
  ) {}

  async create(cycle: Partial<MeasurementCycle>): Promise<MeasurementCycle> {
    const createdCycle = new this.cycleModel(cycle);
    const saved = await createdCycle.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<MeasurementCycle | null> {
    return this.cycleModel.findById(id).lean().exec();
  }

  async findByPlanId(planId: string): Promise<MeasurementCycle[]> {
    return this.cycleModel
      .find({ planId: new Types.ObjectId(planId) })
      .sort({ startDate: 1 })
      .lean()
      .exec();
  }

  async findByPlanAndName(
    planId: string,
    cycleName: string,
  ): Promise<MeasurementCycle | null> {
    return this.cycleModel
      .findOne({
        planId: new Types.ObjectId(planId),
        cycleName,
      })
      .lean()
      .exec();
  }

  async update(
    id: string,
    cycle: Partial<MeasurementCycle>,
  ): Promise<MeasurementCycle | null> {
    return this.cycleModel
      .findByIdAndUpdate(id, cycle, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.cycleModel.findByIdAndDelete(id).exec();
  }

  async countMeasurementsByCycleId(cycleId: string): Promise<number> {
    const MeasurementData = this.cycleModel.db.collection('measurementdata');
    return MeasurementData.countDocuments({
      cycleId: new Types.ObjectId(cycleId),
    });
  }
}
