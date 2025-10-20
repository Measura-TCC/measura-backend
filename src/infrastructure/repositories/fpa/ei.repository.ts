import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EI, EIDocument } from '@domain/fpa/entities/ei.entity';
import { IEIRepository } from '@domain/fpa/interfaces/ei.repository.interface';

@Injectable()
export class EIRepository implements IEIRepository {
  constructor(
    @InjectModel(EI.name) private readonly eiModel: Model<EIDocument>,
    private readonly logger: Logger,
  ) {}

  async create(component: Partial<EI>): Promise<EI> {
    const createdComponent = new this.eiModel(component);
    const saved = await createdComponent.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<EI | null> {
    return this.eiModel.findById(id).lean().exec();
  }

  async findByIds(ids: string[]): Promise<EI[]> {
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

    return this.eiModel.find({ _id: { $in: objectIds } }).lean().exec();
  }

  async findByProject(projectId: string): Promise<EI[]> {
    return this.eiModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
  }

  async findAll(): Promise<EI[]> {
    return this.eiModel.find().lean().exec();
  }

  async update(id: string, component: Partial<EI>): Promise<EI | null> {
    return this.eiModel.findByIdAndUpdate(id, component, { new: true }).lean().exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.eiModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  async findByPrimaryIntent(primaryIntent: string): Promise<EI[]> {
    return this.eiModel.find({ primaryIntent }).lean().exec();
  }
}
