import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Requirement,
  RequirementDocument,
} from '@domain/fpa/entities/requirement.entity';
import { IRequirementRepository } from '@domain/fpa/interfaces/requirement.repository.interface';

@Injectable()
export class RequirementRepository implements IRequirementRepository {
  constructor(
    @InjectModel(Requirement.name)
    private readonly requirementModel: Model<RequirementDocument>,
    private readonly logger: Logger,
  ) {}

  async create(requirement: Partial<Requirement>): Promise<Requirement> {
    const created = new this.requirementModel(requirement);
    const saved = await created.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<Requirement | null> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`Invalid ObjectId format in findById: ${id}`);
      return null;
    }
    return this.requirementModel.findById(id).lean().exec();
  }

  async findByEstimate(estimateId: string): Promise<Requirement[]> {
    if (!Types.ObjectId.isValid(estimateId)) {
      this.logger.warn(
        `Invalid ObjectId format in findByEstimate: ${estimateId}`,
      );
      return [];
    }
    return this.requirementModel
      .find({ estimateId: new Types.ObjectId(estimateId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async findBySource(
    estimateId: string,
    source: string,
    sourceReference: string,
  ): Promise<Requirement | null> {
    if (!Types.ObjectId.isValid(estimateId)) {
      this.logger.warn(`Invalid ObjectId format in findBySource: ${estimateId}`);
      return null;
    }
    return this.requirementModel
      .findOne({
        estimateId: new Types.ObjectId(estimateId),
        source,
        sourceReference,
      })
      .lean()
      .exec();
  }

  async update(
    id: string,
    requirement: Partial<Requirement>,
  ): Promise<Requirement | null> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`Invalid ObjectId format in update: ${id}`);
      return null;
    }
    return this.requirementModel
      .findByIdAndUpdate(id, requirement, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`Invalid ObjectId format in delete: ${id}`);
      return false;
    }
    const result = await this.requirementModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }
}
