import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EQ, EQDocument } from '@domain/fpa/entities/eq.entity';
import { IEQRepository } from '@domain/fpa/interfaces/eq.repository.interface';

@Injectable()
export class EQRepository implements IEQRepository {
  constructor(
    @InjectModel(EQ.name) private readonly eqModel: Model<EQDocument>,
    private readonly logger: Logger,
  ) {}

  async create(component: Partial<EQ>): Promise<EQ> {
    const createdComponent = new this.eqModel(component);
    const saved = await createdComponent.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<EQ | null> {
    return this.eqModel.findById(id).lean().exec();
  }

  async findByIds(ids: string[]): Promise<EQ[]> {
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

    return this.eqModel.find({ _id: { $in: objectIds } }).lean().exec();
  }

  async findByProject(projectId: string): Promise<EQ[]> {
    return this.eqModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
  }

  async findAll(): Promise<EQ[]> {
    return this.eqModel.find().lean().exec();
  }

  async update(id: string, component: Partial<EQ>): Promise<EQ | null> {
    return this.eqModel.findByIdAndUpdate(id, component, { new: true }).lean().exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.eqModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  async findByComplexityFactors(
    fileTypesReferenced: number,
    totalDataElementTypes: number,
  ): Promise<EQ[]> {
    const totalDETs = totalDataElementTypes;
    return this.eqModel
      .find({
        fileTypesReferenced,
        $expr: {
          $eq: [
            { $add: ['$inputDataElementTypes', '$outputDataElementTypes'] },
            totalDETs,
          ],
        },
      })
      .lean()
      .exec();
  }
}
