import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AIE, AIEDocument } from '@domain/fpa/entities/aie.entity';
import { IAIERepository } from '@domain/fpa/interfaces/aie.repository.interface';

@Injectable()
export class AIERepository implements IAIERepository {
  constructor(
    @InjectModel(AIE.name) private readonly aieModel: Model<AIEDocument>,
    private readonly logger: Logger,
  ) {}

  async create(component: Partial<AIE>): Promise<AIE> {
    const createdComponent = new this.aieModel(component);
    const saved = await createdComponent.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<AIE | null> {
    return this.aieModel.findById(id).lean().exec();
  }

  async findByIds(ids: string[]): Promise<AIE[]> {
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

    return this.aieModel.find({ _id: { $in: objectIds } }).lean().exec();
  }

  async findByProject(projectId: string): Promise<AIE[]> {
    return this.aieModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
  }

  async findAll(): Promise<AIE[]> {
    return this.aieModel.find().lean().exec();
  }

  async update(id: string, component: Partial<AIE>): Promise<AIE | null> {
    return this.aieModel.findByIdAndUpdate(id, component, { new: true }).lean().exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.aieModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  async findByExternalSystem(externalSystem: string): Promise<AIE[]> {
    return this.aieModel.find({ externalSystem }).lean().exec();
  }
}
