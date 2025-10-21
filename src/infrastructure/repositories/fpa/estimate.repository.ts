import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Estimate,
  EstimateDocument,
  EstimateStatus,
} from '@domain/fpa/entities/estimate.entity';
import { IEstimateRepository } from '@domain/fpa/interfaces/estimate.repository.interface';

@Injectable()
export class EstimateRepository implements IEstimateRepository {
  constructor(
    @InjectModel(Estimate.name)
    private readonly estimateModel: Model<EstimateDocument>,
    private readonly logger: Logger,
  ) {}

  async create(estimate: Partial<Estimate>): Promise<Estimate> {
    const createdEstimate = new this.estimateModel(estimate);
    const saved = await createdEstimate.save();
    return saved.toObject();
  }

  async findById(id: string): Promise<Estimate | null> {
    return this.estimateModel.findById(id).lean().exec();
  }

  async findByIds(ids: string[]): Promise<Estimate[]> {
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

    return this.estimateModel.find({ _id: { $in: objectIds } }).lean().exec();
  }

  async findByProject(projectId: string): Promise<Estimate[]> {
    return this.estimateModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ version: -1 })
      .lean()
      .exec();
  }

  async findByStatus(status: EstimateStatus): Promise<Estimate[]> {
    return this.estimateModel.find({ status }).lean().exec();
  }

  async findByCreatedBy(userId: string): Promise<Estimate[]> {
    return this.estimateModel
      .find({ createdBy: new Types.ObjectId(userId) })
      .lean()
      .exec();
  }

  async findByOrganization(organizationId: string): Promise<Estimate[]> {
    return this.estimateModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .lean()
      .exec();
  }

  async findAll(): Promise<Estimate[]> {
    return this.estimateModel.find().lean().exec();
  }

  async update(
    id: string,
    estimate: Partial<Estimate>,
  ): Promise<Estimate | null> {
    return this.estimateModel
      .findByIdAndUpdate(id, estimate, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.estimateModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  async findLatestVersion(projectId: string): Promise<Estimate | null> {
    return this.estimateModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .sort({ version: -1 })
      .lean()
      .exec();
  }

  async createNewVersion(id: string): Promise<Estimate | null> {
    // Find the current estimate
    const currentEstimate = await this.estimateModel.findById(id).lean().exec();
    if (!currentEstimate) {
      return null;
    }

    // Find the latest version number for this project
    const latestVersion = await this.estimateModel
      .findOne({ projectId: currentEstimate.projectId })
      .sort({ version: -1 })
      .lean()
      .exec();

    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Create a new object without the _id property using rest parameters
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...newEstimateData } = currentEstimate;

    // Set the version and status
    newEstimateData.version = newVersionNumber;
    newEstimateData.status = EstimateStatus.DRAFT;

    const newEstimate = new this.estimateModel(newEstimateData);
    const saved = await newEstimate.save();
    return saved.toObject();
  }
}
