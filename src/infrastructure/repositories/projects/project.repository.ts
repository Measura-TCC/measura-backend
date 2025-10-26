import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Project,
  ProjectDocument,
} from '@domain/projects/entities/project.entity';
import { IProjectRepository } from '@domain/projects/interfaces/project.repository.interface';

@Injectable()
export class ProjectRepository implements IProjectRepository {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly logger: Logger,
  ) {}

  async create(project: Partial<Project>): Promise<Project> {
    const createdProject = new this.projectModel(project);
    return createdProject.save();
  }

  async findById(id: string): Promise<Project | null> {
    return this.projectModel.findById(id).lean().exec();
  }

  async findByIds(ids: string[]): Promise<Project[]> {
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

    return this.projectModel.find({ _id: { $in: objectIds } }).exec();
  }

  async findAll(): Promise<Project[]> {
    return this.projectModel.find().exec();
  }

  async findByOrganization(organizationId: string): Promise<Project[]> {
    if (!Types.ObjectId.isValid(organizationId)) {
      this.logger.warn(
        `Invalid ObjectId format in findByOrganization: ${organizationId}`,
      );
      return [];
    }
    return this.projectModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .lean()
      .exec();
  }

  async update(id: string, project: Partial<Project>): Promise<Project | null> {
    return this.projectModel
      .findByIdAndUpdate(id, project, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.projectModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  async findByCreatedBy(userId: string): Promise<Project[]> {
    return this.projectModel
      .find({ createdBy: new Types.ObjectId(userId) })
      .exec();
  }
}
