import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EO, EODocument } from '@domain/fpa/entities/eo.entity';
import { IEORepository } from '@domain/fpa/interfaces/eo.repository.interface';

@Injectable()
export class EORepository implements IEORepository {
  constructor(
    @InjectModel(EO.name) private readonly eoModel: Model<EODocument>,
    private readonly logger: Logger,
  ) {}

  async create(component: Partial<EO>): Promise<EO> {
    const createdComponent = new this.eoModel(component);
    const saved = await createdComponent.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<EO | null> {
    return this.eoModel.findById(id).lean().exec();
  }

  async findByIds(ids: string[]): Promise<EO[]> {
    const objectIds = ids
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          this.logger.warn(`Invalid ObjectId format: ${id}`);
          return null;
        }
      })
      .filter((id): id is Types.ObjectId => id !== null);

    if (objectIds.length === 0) {
      return [];
    }

    return this.eoModel.find({ _id: { $in: objectIds } }).lean().exec();
  }

  async findByProject(projectId: string): Promise<EO[]> {
    return this.eoModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
  }

  async findAll(): Promise<EO[]> {
    return this.eoModel.find().lean().exec();
  }

  async update(id: string, component: Partial<EO>): Promise<EO | null> {
    return this.eoModel.findByIdAndUpdate(id, component, { new: true }).lean().exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.eoModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  async findByAdditionalProcessingFlag(
    hasAdditionalProcessing: boolean,
  ): Promise<EO[]> {
    return this.eoModel.find({ hasAdditionalProcessing }).lean().exec();
  }
}
