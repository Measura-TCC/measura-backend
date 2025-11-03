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

  async getMeasurementDataByPlanId(planId: string): Promise<any[]> {
    return this.cycleModel
      .aggregate([
        {
          $match: { planId: new Types.ObjectId(planId) },
        },
        {
          $lookup: {
            from: 'measurementdata',
            localField: '_id',
            foreignField: 'cycleId',
            as: 'measurements',
          },
        },
        {
          $unwind: {
            path: '$measurements',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'measurementplans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan',
          },
        },
        {
          $unwind: '$plan',
        },
        {
          $addFields: {
            metricInfo: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: {
                      $reduce: {
                        input: '$plan.objectives',
                        initialValue: [],
                        in: {
                          $concatArrays: [
                            '$$value',
                            {
                              $reduce: {
                                input: '$$this.questions',
                                initialValue: [],
                                in: { $concatArrays: ['$$value', '$$this.metrics'] },
                              },
                            },
                          ],
                        },
                      },
                    },
                    cond: { $eq: ['$$this._id', '$measurements.metricId'] },
                  },
                },
                0,
              ],
            },
            measurementDef: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: {
                      $reduce: {
                        input: '$plan.objectives',
                        initialValue: [],
                        in: {
                          $concatArrays: [
                            '$$value',
                            {
                              $reduce: {
                                input: '$$this.questions',
                                initialValue: [],
                                in: {
                                  $concatArrays: [
                                    '$$value',
                                    {
                                      $reduce: {
                                        input: '$$this.metrics',
                                        initialValue: [],
                                        in: { $concatArrays: ['$$value', '$$this.measurements'] },
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                    cond: { $eq: ['$$this._id', '$measurements.measurementDefinitionId'] },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            metricId: '$measurements.metricId',
            metricName: '$metricInfo.metricName',
            metricMnemonic: '$metricInfo.metricMnemonic',
            value: '$measurements.value',
            unit: '$measurementDef.measurementUnit',
            collectedAt: '$measurements.date',
            cycleId: '$_id',
            cycleName: '$cycleName',
          },
        },
        {
          $sort: { collectedAt: 1 },
        },
      ])
      .exec();
  }

  async getCalculationsByPlanId(planId: string): Promise<any[]> {
    // This uses the MetricCalculationService to compute values on-demand
    // Returns empty for now - will be populated by service layer
    return [];
  }
}
