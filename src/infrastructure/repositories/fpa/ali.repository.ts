import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ALI, ALIDocument } from '@domain/fpa/entities/ali.entity';
import { IALIRepository } from '@domain/fpa/interfaces/ali.repository.interface';

@Injectable()
export class ALIRepository implements IALIRepository {
  constructor(
    @InjectModel(ALI.name) private readonly aliModel: Model<ALIDocument>,
    private readonly logger: Logger,
  ) {}

  async create(component: Partial<ALI>): Promise<ALI> {
    const createdComponent = new this.aliModel(component);
    const saved = await createdComponent.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<ALI | null> {
    return this.aliModel.findById(id).lean().exec();
  }

  async findByIds(ids: string[]): Promise<ALI[]> {
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

    return this.aliModel.find({ _id: { $in: objectIds } }).lean().exec();
  }

  async findByProject(projectId: string): Promise<ALI[]> {
    return this.aliModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
  }

  async findAll(): Promise<ALI[]> {
    return this.aliModel.find().lean().exec();
  }

  async update(id: string, component: Partial<ALI>): Promise<ALI | null> {
    return this.aliModel.findByIdAndUpdate(id, component, { new: true }).lean().exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.aliModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  async findByComplexityMetrics(
    recordElementTypes: number,
    dataElementTypes: number,
  ): Promise<ALI[]> {
    return this.aliModel
      .find({
        recordElementTypes: recordElementTypes,
        dataElementTypes: dataElementTypes,
      })
      .lean()
      .exec();
  }
}
