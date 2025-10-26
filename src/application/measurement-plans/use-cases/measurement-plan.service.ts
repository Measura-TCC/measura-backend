import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  MEASUREMENT_PLAN_REPOSITORY,
  IMeasurementPlanRepository,
} from '@domain/measurement-plans/interfaces/measurement-plan.repository.interface';
import {
  MeasurementPlan,
  MeasurementPlanStatus,
} from '@domain/measurement-plans/entities/measurement-plan.entity';
import {
  CreateMeasurementPlanDto,
  UpdateMeasurementPlanDto,
  MeasurementPlanSummaryDto,
  MeasurementPlanResponseDto,
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  CreateMetricDto,
  UpdateMetricDto,
  CreateMeasurementDto,
  UpdateMeasurementDto,
} from '../dtos';
import { ProjectService } from '@application/projects/use-cases/project.service';

@Injectable()
export class MeasurementPlanService {
  constructor(
    @Inject(MEASUREMENT_PLAN_REPOSITORY)
    private readonly measurementPlanRepository: IMeasurementPlanRepository,
    private readonly projectService: ProjectService,
  ) {}

  // Basic CRUD operations
  async create(
    createDto: CreateMeasurementPlanDto,
    userId: string,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    // Validate that the project belongs to the same organization
    const project = await this.projectService.findOne(
      createDto.associatedProject,
    );
    if (project.organizationId.toString() !== organizationId) {
      throw new ForbiddenException(
        'Cannot create measurement plan for project from different organization',
      );
    }

    // Check if project already has a measurement plan
    if (project.measurementPlanId) {
      throw new BadRequestException(
        'Project already has an associated measurement plan. Each project can have only one measurement plan.',
      );
    }

    // Assign order indexes to nested entities
    const objectivesWithIndexes =
      createDto.objectives?.map((obj) => ({
        ...obj,
        _id: new Types.ObjectId(),
        questions:
          obj.questions?.map((q) => ({
            ...q,
            _id: new Types.ObjectId(),
            metrics:
              q.metrics?.map((m) => ({
                ...m,
                _id: new Types.ObjectId(),
                measurements: m.measurements.map((measurement) => ({
                  ...measurement,
                  _id: new Types.ObjectId(),
                })),
              })) || [],
          })) || [],
      })) || [];

    const planData = {
      ...createDto,
      organizationId: new Types.ObjectId(organizationId),
      associatedProject: new Types.ObjectId(createDto.associatedProject),
      createdBy: new Types.ObjectId(userId),
      status: MeasurementPlanStatus.DRAFT,
      objectives: objectivesWithIndexes,
    };

    const createdPlan = await this.measurementPlanRepository.create(planData);

    // Auto-link the measurement plan to the project
    if (createDto.associatedProject) {
      try {
        const project = await this.projectService.findOne(
          createDto.associatedProject,
        );

        // Ensure project belongs to the same organization
        if (project.organizationId.toString() === organizationId) {
          await this.projectService.update(createDto.associatedProject, {
            measurementPlanId: createdPlan._id.toString(),
          });
        }
      } catch (error) {
        // If project linking fails, log error but don't fail the plan creation
        console.warn('Failed to link measurement plan to project:', error);
      }
    }

    return createdPlan;
  }

  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: string;
      projectId?: string;
      search?: string;
    },
  ): Promise<{
    data: MeasurementPlanSummaryDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.measurementPlanRepository.findWithPagination(
      organizationId,
      page,
      limit,
      filters,
    );

    const summaries = await Promise.all(
      result.data.map(async (plan) => {
        const stats = await this.measurementPlanRepository.getPlanStatistics(
          plan._id.toString(),
        );
        return this.mapToSummaryDto(plan, stats);
      }),
    );

    return {
      data: summaries,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<MeasurementPlanResponseDto> {
    const plan = await this.measurementPlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Measurement plan with ID "${id}" not found`);
    }

    // Ensure user has access to this plan
    if (plan.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this measurement plan');
    }

    // Fetch associated project name
    let associatedProjectName = 'N/A';
    try {
      const project = await this.projectService.findOne(
        plan.associatedProject.toString(),
      );
      associatedProjectName = project.name;
    } catch (error) {
      // If project not found, keep default 'N/A'
    }

    const stats = await this.measurementPlanRepository.getPlanStatistics(id);
    return this.mapToResponseDto(plan, stats, associatedProjectName);
  }

  async update(
    id: string,
    updateDto: UpdateMeasurementPlanDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    const existingPlan = await this.measurementPlanRepository.findById(id);
    if (!existingPlan) {
      throw new NotFoundException(`Measurement plan with ID "${id}" not found`);
    }

    // Ensure user has access to this plan
    if (existingPlan.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this measurement plan');
    }

    // Validate status transitions
    if (
      updateDto.status &&
      !this.isValidStatusTransition(existingPlan.status, updateDto.status)
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${existingPlan.status} to ${updateDto.status}`,
      );
    }

    const updateData: any = { ...updateDto };

    // Handle project reference update
    if (updateDto.associatedProject) {
      updateData.associatedProject = new Types.ObjectId(
        updateDto.associatedProject,
      );
    }

    // Process nested entities if provided
    if (updateDto.objectives) {
      updateData.objectives = updateDto.objectives.map((obj) => ({
        ...obj,
        questions:
          obj.questions?.map((q) => ({
            ...q,
            metrics:
              q.metrics?.map((m) => ({
                ...m,
                measurements:
                  m.measurements?.map((measurement) => ({
                    ...measurement,
                  })) || [],
              })) || [],
          })) || [],
      }));
    }

    const updatedPlan = await this.measurementPlanRepository.update(
      id,
      updateData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to update measurement plan with ID "${id}"`,
      );
    }

    return updatedPlan;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const plan = await this.measurementPlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Measurement plan with ID "${id}" not found`);
    }

    // Ensure user has access to this plan
    if (plan.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this measurement plan');
    }

    // Prevent deletion of approved or finished plans
    if (
      plan.status === MeasurementPlanStatus.APPROVED ||
      plan.status === MeasurementPlanStatus.FINISHED
    ) {
      throw new ConflictException(
        'Cannot delete approved or finished measurement plans',
      );
    }

    // Unlink from project before deletion
    if (plan.associatedProject) {
      try {
        await this.projectService.update(plan.associatedProject.toString(), {
          measurementPlanId: undefined,
        });
      } catch (error) {
        // If project unlinking fails, log error but continue with deletion
        console.warn('Failed to unlink measurement plan from project:', error);
      }
    }

    const result = await this.measurementPlanRepository.delete(id);
    if (!result) {
      throw new BadRequestException(
        `Failed to delete measurement plan with ID "${id}"`,
      );
    }
  }

  // Nested entity operations - Objectives
  async addObjective(
    planId: string,
    createDto: CreateObjectiveDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const objectiveData = {
      ...createDto,
      _id: new Types.ObjectId(),
      questions:
        createDto.questions?.map((q) => ({
          ...q,
          _id: new Types.ObjectId(),
          metrics:
            q.metrics?.map((m) => ({
              ...m,
              _id: new Types.ObjectId(),
              measurements: m.measurements.map((measurement) => ({
                ...measurement,
                _id: new Types.ObjectId(),
              })),
            })) || [],
        })) || [],
    };

    const updatedPlan = await this.measurementPlanRepository.addObjective(
      planId,
      objectiveData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to add objective to plan "${planId}"`,
      );
    }

    return updatedPlan;
  }

  async updateObjective(
    planId: string,
    objectiveId: string,
    updateDto: UpdateObjectiveDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const updateData: any = { ...updateDto };

    if (updateDto.questions) {
      updateData.questions = updateDto.questions.map((q) => ({
        ...q,
        metrics:
          q.metrics?.map((m) => ({
            ...m,
            measurements:
              m.measurements?.map((measurement) => ({
                ...measurement,
              })) || [],
          })) || [],
      }));
    }

    const updatedPlan = await this.measurementPlanRepository.updateObjective(
      planId,
      objectiveId,
      updateData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to update objective "${objectiveId}" in plan "${planId}"`,
      );
    }

    return updatedPlan;
  }

  async deleteObjective(
    planId: string,
    objectiveId: string,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const updatedPlan = await this.measurementPlanRepository.deleteObjective(
      planId,
      objectiveId,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to delete objective "${objectiveId}" from plan "${planId}"`,
      );
    }

    return updatedPlan;
  }

  // Nested entity operations - Questions
  async addQuestion(
    planId: string,
    objectiveId: string,
    createDto: CreateQuestionDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const questionData = {
      ...createDto,
      _id: new Types.ObjectId(),
      metrics:
        createDto.metrics?.map((m) => ({
          ...m,
          _id: new Types.ObjectId(),
          measurements: m.measurements.map((measurement) => ({
            ...measurement,
            _id: new Types.ObjectId(),
          })),
        })) || [],
    };

    const updatedPlan = await this.measurementPlanRepository.addQuestion(
      planId,
      objectiveId,
      questionData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to add question to objective "${objectiveId}" in plan "${planId}"`,
      );
    }

    return updatedPlan;
  }

  async updateQuestion(
    planId: string,
    objectiveId: string,
    questionId: string,
    updateDto: UpdateQuestionDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const updateData: any = { ...updateDto };

    if (updateDto.metrics) {
      updateData.metrics = updateDto.metrics.map((m) => ({
        ...m,
        measurements:
          m.measurements?.map((measurement) => ({
            ...measurement,
          })) || [],
      }));
    }

    const updatedPlan = await this.measurementPlanRepository.updateQuestion(
      planId,
      objectiveId,
      questionId,
      updateData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to update question "${questionId}" in objective "${objectiveId}"`,
      );
    }

    return updatedPlan;
  }

  async deleteQuestion(
    planId: string,
    objectiveId: string,
    questionId: string,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const updatedPlan = await this.measurementPlanRepository.deleteQuestion(
      planId,
      objectiveId,
      questionId,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to delete question "${questionId}" from objective "${objectiveId}"`,
      );
    }

    return updatedPlan;
  }

  // Nested entity operations - Metrics
  async addMetric(
    planId: string,
    objectiveId: string,
    questionId: string,
    createDto: CreateMetricDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    // Validate unique mnemonic
    const isUniqueMetricMnemonic =
      await this.measurementPlanRepository.validateUniqueMetricMnemonic(
        planId,
        createDto.metricMnemonic,
      );
    if (!isUniqueMetricMnemonic) {
      throw new ConflictException(
        `Metric mnemonic "${createDto.metricMnemonic}" already exists in this plan`,
      );
    }

    const metricData = {
      ...createDto,
      _id: new Types.ObjectId(),
      measurements: createDto.measurements.map((measurement) => ({
        ...measurement,
        _id: new Types.ObjectId(),
      })),
    };

    const updatedPlan = await this.measurementPlanRepository.addMetric(
      planId,
      objectiveId,
      questionId,
      metricData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to add metric to question "${questionId}"`,
      );
    }

    return updatedPlan;
  }

  async updateMetric(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    updateDto: UpdateMetricDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    // Validate unique mnemonic if provided
    if (updateDto.metricMnemonic) {
      const isUniqueMetricMnemonic =
        await this.measurementPlanRepository.validateUniqueMetricMnemonic(
          planId,
          updateDto.metricMnemonic,
          metricId,
        );
      if (!isUniqueMetricMnemonic) {
        throw new ConflictException(
          `Metric mnemonic "${updateDto.metricMnemonic}" already exists in this plan`,
        );
      }
    }

    const updateData: any = { ...updateDto };

    if (updateDto.measurements) {
      updateData.measurements = updateDto.measurements.map((measurement) => ({
        ...measurement,
      }));
    }

    const updatedPlan = await this.measurementPlanRepository.updateMetric(
      planId,
      objectiveId,
      questionId,
      metricId,
      updateData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(`Failed to update metric "${metricId}"`);
    }

    return updatedPlan;
  }

  async deleteMetric(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const updatedPlan = await this.measurementPlanRepository.deleteMetric(
      planId,
      objectiveId,
      questionId,
      metricId,
    );
    if (!updatedPlan) {
      throw new NotFoundException(`Failed to delete metric "${metricId}"`);
    }

    return updatedPlan;
  }

  // Nested entity operations - Measurements
  async addMeasurement(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    createDto: CreateMeasurementDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    // Validate unique acronym within metric
    const isUniqueAcronym =
      await this.measurementPlanRepository.validateUniqueMeasurementAcronym(
        planId,
        objectiveId,
        questionId,
        metricId,
        createDto.measurementAcronym,
      );
    if (!isUniqueAcronym) {
      throw new ConflictException(
        `Measurement acronym "${createDto.measurementAcronym}" already exists in this metric`,
      );
    }

    const measurementData = {
      ...createDto,
      _id: new Types.ObjectId(),
    };

    const updatedPlan = await this.measurementPlanRepository.addMeasurement(
      planId,
      objectiveId,
      questionId,
      metricId,
      measurementData,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to add measurement to metric "${metricId}"`,
      );
    }

    return updatedPlan;
  }

  async updateMeasurement(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    measurementId: string,
    updateDto: UpdateMeasurementDto,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    // Validate unique acronym if provided
    if (updateDto.measurementAcronym) {
      const isUniqueAcronym =
        await this.measurementPlanRepository.validateUniqueMeasurementAcronym(
          planId,
          objectiveId,
          questionId,
          metricId,
          updateDto.measurementAcronym,
          measurementId,
        );
      if (!isUniqueAcronym) {
        throw new ConflictException(
          `Measurement acronym "${updateDto.measurementAcronym}" already exists in this metric`,
        );
      }
    }

    const updatedPlan = await this.measurementPlanRepository.updateMeasurement(
      planId,
      objectiveId,
      questionId,
      metricId,
      measurementId,
      updateDto,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to update measurement "${measurementId}"`,
      );
    }

    return updatedPlan;
  }

  async deleteMeasurement(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    measurementId: string,
    organizationId: string,
  ): Promise<MeasurementPlan> {
    await this.validatePlanAccess(planId, organizationId);

    const updatedPlan = await this.measurementPlanRepository.deleteMeasurement(
      planId,
      objectiveId,
      questionId,
      metricId,
      measurementId,
    );
    if (!updatedPlan) {
      throw new NotFoundException(
        `Failed to delete measurement "${measurementId}"`,
      );
    }

    return updatedPlan;
  }

  // Helper methods
  private async validatePlanAccess(
    planId: string,
    organizationId: string,
  ): Promise<void> {
    const plan = await this.measurementPlanRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(
        `Measurement plan with ID "${planId}" not found`,
      );
    }

    if (plan.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this measurement plan');
    }
  }

  private isValidStatusTransition(
    currentStatus: MeasurementPlanStatus,
    newStatus: MeasurementPlanStatus,
  ): boolean {
    const transitions: Record<MeasurementPlanStatus, MeasurementPlanStatus[]> =
      {
        [MeasurementPlanStatus.DRAFT]: [
          MeasurementPlanStatus.APPROVED,
          MeasurementPlanStatus.REJECTED,
        ],
        [MeasurementPlanStatus.APPROVED]: [
          MeasurementPlanStatus.FINISHED,
          MeasurementPlanStatus.DRAFT,
        ],
        [MeasurementPlanStatus.REJECTED]: [MeasurementPlanStatus.DRAFT],
        [MeasurementPlanStatus.FINISHED]: [], // No transitions allowed from finished
      };

    return transitions[currentStatus]?.includes(newStatus) || false;
  }

  private calculateProgress(stats: any): number {
    if (!stats || stats.objectivesCount === 0) return 0;

    // Simple progress calculation based on having measurements
    // This could be enhanced with more sophisticated logic
    const hasContent =
      stats.measurementsCount > 0
        ? 100
        : stats.metricsCount > 0
          ? 75
          : stats.questionsCount > 0
            ? 50
            : stats.objectivesCount > 0
              ? 25
              : 0;

    return hasContent;
  }

  private mapToSummaryDto(
    plan: MeasurementPlan,
    stats: any,
  ): MeasurementPlanSummaryDto {
    return {
      id: plan._id.toString(),
      planName: plan.planName,
      associatedProject: plan.associatedProject.toString(),
      planResponsible: plan.planResponsible,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      objectivesCount: stats?.objectivesCount || 0,
      questionsCount: stats?.questionsCount || 0,
      metricsCount: stats?.metricsCount || 0,
      measurementsCount: stats?.measurementsCount || 0,
      progress: this.calculateProgress(stats),
    };
  }

  private mapToResponseDto(
    plan: MeasurementPlan,
    stats: any,
    associatedProjectName?: string,
  ): MeasurementPlanResponseDto {
    return {
      ...this.mapToSummaryDto(plan, stats),
      organizationId: plan.organizationId.toString(),
      createdBy: plan.createdBy.toString(),
      objectives: plan.objectives,
      associatedProjectName,
    };
  }
}
