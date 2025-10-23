import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  IProjectRepository,
} from '@domain/projects/interfaces/project.repository.interface';
import {
  Project,
  ProjectObjective,
} from '@domain/projects/entities/project.entity';
import { CreateProjectDto } from '@application/projects/dtos/create-project.dto';
import { UpdateProjectDto } from '@application/projects/dtos/update-project.dto';
import { Types } from 'mongoose';
import { MeasurementPlanRepository } from '@infrastructure/repositories/measurement-plans/measurement-plan.repository';
import { EstimateRepository } from '@infrastructure/repositories/fpa/estimate.repository';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    private readonly measurementPlanRepository: MeasurementPlanRepository,
    private readonly estimateRepository: EstimateRepository,
  ) {}

  /**
   * Validates that a project belongs to the specified organization
   * @param projectId - The project ID to validate
   * @param organizationId - The expected organization ID
   * @throws ForbiddenException if project doesn't belong to organization
   * @throws NotFoundException if project doesn't exist
   */
  async validateProjectAccess(
    projectId: string,
    organizationId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    if (project.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }
  }

  async create(
    createProjectDto: CreateProjectDto,
    createdBy: string,
  ): Promise<Project> {
    // Convert objectives with generated IDs
    const objectives: ProjectObjective[] =
      createProjectDto.objectives?.map((obj) => ({
        _id: new Types.ObjectId(),
        title: obj.title,
        description: obj.description,
        organizationalObjectiveIds:
          obj.organizationalObjectiveIds?.map((id) => new Types.ObjectId(id)) ||
          [],
      })) || [];

    const projectData: Partial<Project> = {
      ...createProjectDto,
      createdBy: new Types.ObjectId(createdBy),
      organizationId: new Types.ObjectId(createProjectDto.organizationId),
      objectives,
    };

    const newProject = await this.projectRepository.create(projectData);
    return newProject;
  }

  async findAll(): Promise<Project[]> {
    return await this.projectRepository.findAll();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
    return project;
  }

  async findOneWithRelations(id: string): Promise<any> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    // Find all measurement plans linked to this project
    const measurementPlans = await this.measurementPlanRepository.findByProjectId(id);

    // Find all estimates linked to this project
    const estimates = await this.estimateRepository.findByProject(id);

    return {
      ...project,
      measurementPlans,
      estimates,
    };
  }

  async findByOrganization(organizationId: string): Promise<any[]> {
    const projects = await this.projectRepository.findByOrganization(organizationId);

    // Para cada projeto, buscar seus plans e estimates
    const projectsWithRelations = await Promise.all(
      projects.map(async (project) => {
        const measurementPlans = await this.measurementPlanRepository.findByProjectId(project._id.toString());
        const estimates = await this.estimateRepository.findByProject(project._id.toString());

        return {
          ...project,
          measurementPlans,
          estimates,
        };
      })
    );

    return projectsWithRelations;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    const updateData: Partial<Project> = {};

    if (updateProjectDto.name !== undefined) {
      updateData.name = updateProjectDto.name;
    }
    if (updateProjectDto.description !== undefined) {
      updateData.description = updateProjectDto.description;
    }
    if (updateProjectDto.status !== undefined) {
      updateData.status = updateProjectDto.status;
    }
    if (updateProjectDto.startDate !== undefined) {
      updateData.startDate = updateProjectDto.startDate;
    }
    if (updateProjectDto.endDate !== undefined) {
      updateData.endDate = updateProjectDto.endDate;
    }
    if (updateProjectDto.organizationId) {
      updateData.organizationId = new Types.ObjectId(
        updateProjectDto.organizationId,
      );
    }

    const updatedProject = await this.projectRepository.update(id, updateData);

    if (!updatedProject) {
      throw new NotFoundException(`Failed to update project with ID "${id}"`);
    }

    return updatedProject;
  }

  async remove(id: string): Promise<boolean> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    // Prevent deletion if project has linked measurement plan or estimate
    if (project.measurementPlanId || project.estimateId) {
      const linkedResources: string[] = [];
      if (project.measurementPlanId) linkedResources.push('measurement plan');
      if (project.estimateId) linkedResources.push('estimate');

      throw new BadRequestException(
        `Cannot delete project with linked ${linkedResources.join(' and ')}. Please delete or unlink the associated resources first.`,
      );
    }

    const result = await this.projectRepository.delete(id);
    if (!result) {
      throw new BadRequestException(`Failed to delete project with ID "${id}"`);
    }

    return true;
  }

  async getVersions(id: string): Promise<any[]> {
    // Placeholder implementation - you can implement versioning logic here
    const project = await this.findOne(id);
    return [
      {
        version: '1.0.0',
        createdAt: project.createdAt,
        description: 'Initial version',
      },
    ];
  }

  async createVersion(id: string): Promise<any> {
    // Placeholder implementation - you can implement versioning logic here
    const project = await this.findOne(id);
    return {
      version: '1.1.0',
      createdAt: new Date(),
      description: 'New version created',
      projectId: project._id,
    };
  }
}
