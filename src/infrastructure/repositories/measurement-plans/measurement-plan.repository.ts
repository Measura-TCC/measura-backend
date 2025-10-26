import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MeasurementPlan,
  MeasurementPlanDocument,
  Objective,
  Question,
  Metric,
  Measurement,
} from '@domain/measurement-plans/entities/measurement-plan.entity';
import { IMeasurementPlanRepository } from '@domain/measurement-plans/interfaces/measurement-plan.repository.interface';

@Injectable()
export class MeasurementPlanRepository implements IMeasurementPlanRepository {
  private readonly logger = new Logger(MeasurementPlanRepository.name);

  constructor(
    @InjectModel(MeasurementPlan.name)
    private readonly measurementPlanModel: Model<MeasurementPlanDocument>,
  ) {}

  private handleError<T>(
    methodName: string,
    error: unknown,
    defaultReturn?: T,
  ): T {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack =
      error instanceof Error ? error.stack : new Error(String(error)).stack;

    this.logger.error(`Error in ${methodName}: ${errorMessage}`, errorStack);

    if (defaultReturn !== undefined) {
      return defaultReturn;
    }
    throw error instanceof Error ? error : new Error(String(error));
  }

  // Basic CRUD operations
  async create(plan: Partial<MeasurementPlan>): Promise<MeasurementPlan> {
    try {
      const createdPlan = new this.measurementPlanModel({
        ...plan,
        objectives: plan.objectives || [],
      });
      return await createdPlan.save();
    } catch (error) {
      return this.handleError('create', error);
    }
  }

  async findById(id: string): Promise<MeasurementPlan | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        this.logger.warn(`Invalid ObjectId format in findById: ${id}`);
        return null;
      }
      const result = await this.measurementPlanModel.findById(id).exec();
      if (!result) return null;
      return result.toObject();
    } catch (error) {
      return this.handleError('findById', error, null);
    }
  }

  async findAll(
    organizationId?: string,
    status?: string,
  ): Promise<MeasurementPlan[]> {
    try {
      const filter: any = {};
      if (organizationId && Types.ObjectId.isValid(organizationId)) {
        filter.organizationId = new Types.ObjectId(organizationId);
      }
      if (status) {
        filter.status = status;
      }
      return this.measurementPlanModel
        .find(filter)
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      return this.handleError('findAll', error, []);
    }
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<MeasurementPlan[]> {
    try {
      if (!Types.ObjectId.isValid(organizationId)) {
        this.logger.warn(
          `Invalid ObjectId format in findByOrganizationId: ${organizationId}`,
        );
        return [];
      }
      return this.measurementPlanModel
        .find({ organizationId: new Types.ObjectId(organizationId) })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      return this.handleError('findByOrganizationId', error, []);
    }
  }

  async findByProjectId(projectId: string): Promise<MeasurementPlan[]> {
    try {
      if (!Types.ObjectId.isValid(projectId)) {
        this.logger.warn(
          `Invalid ObjectId format in findByProjectId: ${projectId}`,
        );
        return [];
      }
      return this.measurementPlanModel
        .find({ associatedProject: new Types.ObjectId(projectId) })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    } catch (error) {
      return this.handleError('findByProjectId', error, []);
    }
  }

  async findByCreatedBy(userId: string): Promise<MeasurementPlan[]> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        this.logger.warn(
          `Invalid ObjectId format in findByCreatedBy: ${userId}`,
        );
        return [];
      }
      return this.measurementPlanModel
        .find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      return this.handleError('findByCreatedBy', error, []);
    }
  }

  async update(
    id: string,
    plan: Partial<MeasurementPlan>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        this.logger.warn(`Invalid ObjectId format in update: ${id}`);
        return null;
      }
      return this.measurementPlanModel
        .findByIdAndUpdate(id, plan, { new: true })
        .exec();
    } catch (error) {
      return this.handleError('update', error, null);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        this.logger.warn(`Invalid ObjectId format in delete: ${id}`);
        return false;
      }
      const result = await this.measurementPlanModel
        .deleteOne({ _id: id })
        .exec();
      return result.deletedCount > 0;
    } catch (error) {
      return this.handleError('delete', error, false);
    }
  }

  // Nested entity operations - Objectives
  async addObjective(
    planId: string,
    objective: Partial<Objective>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (!Types.ObjectId.isValid(planId)) {
        this.logger.warn(`Invalid ObjectId format in addObjective: ${planId}`);
        return null;
      }

      const newObjective = {
        ...objective,
        _id: new Types.ObjectId(),
        questions: objective.questions || [],
      };

      return this.measurementPlanModel
        .findByIdAndUpdate(
          planId,
          { $push: { objectives: newObjective } },
          { new: true },
        )
        .exec();
    } catch (error) {
      return this.handleError('addObjective', error, null);
    }
  }

  async updateObjective(
    planId: string,
    objectiveId: string,
    objective: Partial<Objective>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId)
      ) {
        this.logger.warn(
          `Invalid ObjectId format in updateObjective: ${planId}, ${objectiveId}`,
        );
        return null;
      }

      const updateFields: any = {};
      Object.keys(objective).forEach((key) => {
        // Don't update _id or nested arrays (questions should use dedicated endpoints)
        if (key !== '_id' && key !== 'questions') {
          updateFields[`objectives.$.${key}`] =
            objective[key as keyof Objective];
        }
      });

      return this.measurementPlanModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(planId),
            'objectives._id': new Types.ObjectId(objectiveId),
          },
          { $set: updateFields },
          { new: true },
        )
        .exec();
    } catch (error) {
      return this.handleError('updateObjective', error, null);
    }
  }

  async deleteObjective(
    planId: string,
    objectiveId: string,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId)
      ) {
        this.logger.warn(
          `Invalid ObjectId format in deleteObjective: ${planId}, ${objectiveId}`,
        );
        return null;
      }

      return this.measurementPlanModel
        .findByIdAndUpdate(
          planId,
          { $pull: { objectives: { _id: new Types.ObjectId(objectiveId) } } },
          { new: true },
        )
        .exec();
    } catch (error) {
      return this.handleError('deleteObjective', error, null);
    }
  }

  // Nested entity operations - Questions
  async addQuestion(
    planId: string,
    objectiveId: string,
    question: Partial<Question>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId)
      ) {
        this.logger.warn(
          `Invalid ObjectId format in addQuestion: ${planId}, ${objectiveId}`,
        );
        return null;
      }

      const newQuestion = {
        ...question,
        _id: new Types.ObjectId(),
        metrics: question.metrics || [],
      };

      return this.measurementPlanModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(planId),
            'objectives._id': new Types.ObjectId(objectiveId),
          },
          { $push: { 'objectives.$.questions': newQuestion } },
          { new: true },
        )
        .exec();
    } catch (error) {
      return this.handleError('addQuestion', error, null);
    }
  }

  async updateQuestion(
    planId: string,
    objectiveId: string,
    questionId: string,
    question: Partial<Question>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId)
      ) {
        this.logger.warn(`Invalid ObjectId format in updateQuestion`);
        return null;
      }

      // For nested array updates, we need to use a more complex approach
      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return null;

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) return null;

      const questionIndex = objective.questions.findIndex(
        (q) => q._id.toString() === questionId,
      );
      if (questionIndex === -1) return null;

      Object.keys(question).forEach((key) => {
        // Don't update _id or nested arrays (metrics should use dedicated endpoints)
        if (key !== '_id' && key !== 'metrics') {
          (objective.questions[questionIndex] as any)[key] =
            question[key as keyof Question];
        }
      });

      plan.markModified('objectives');
      return await plan.save();
    } catch (error) {
      return this.handleError('updateQuestion', error, null);
    }
  }

  async deleteQuestion(
    planId: string,
    objectiveId: string,
    questionId: string,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId)
      ) {
        this.logger.warn(`Invalid ObjectId format in deleteQuestion`);
        return null;
      }

      return this.measurementPlanModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(planId),
            'objectives._id': new Types.ObjectId(objectiveId),
          },
          { $pull: { 'objectives.$.questions': { _id: new Types.ObjectId(questionId) } } },
          { new: true },
        )
        .exec();
    } catch (error) {
      return this.handleError('deleteQuestion', error, null);
    }
  }

  // Nested entity operations - Metrics
  async addMetric(
    planId: string,
    objectiveId: string,
    questionId: string,
    metric: Partial<Metric>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId)
      ) {
        this.logger.warn(`Invalid ObjectId format in addMetric`);
        return null;
      }

      const newMetric = {
        ...metric,
        _id: new Types.ObjectId(),
        measurements:
          metric.measurements?.map((m) => ({
            ...m,
            _id: new Types.ObjectId(),
          })) || [],
      };

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) {
        this.logger.warn(`Plan not found: ${planId}`);
        return null;
      }

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) {
        this.logger.warn(`Objective not found: ${objectiveId} in plan ${planId}`);
        return null;
      }

      const question = objective.questions.find(
        (q) => q._id.toString() === questionId,
      );
      if (!question) {
        this.logger.warn(`Question not found: ${questionId} in objective ${objectiveId}`);
        return null;
      }

      this.logger.log(`Adding metric to question ${questionId}, current metrics: ${question.metrics.length}`);
      question.metrics.push(newMetric as Metric);
      this.logger.log(`After push, metrics count: ${question.metrics.length}`);

      // Mark the nested array as modified so Mongoose saves it
      plan.markModified('objectives');

      const savedPlan = await plan.save();
      this.logger.log(`Plan saved successfully, metrics in saved plan: ${savedPlan.objectives.find(o => o._id.toString() === objectiveId)?.questions.find(q => q._id.toString() === questionId)?.metrics.length}`);

      return savedPlan;
    } catch (error) {
      return this.handleError('addMetric', error, null);
    }
  }

  async updateMetric(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    metric: Partial<Metric>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId) ||
        !Types.ObjectId.isValid(metricId)
      ) {
        this.logger.warn(`Invalid ObjectId format in updateMetric`);
        return null;
      }

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return null;

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) return null;

      const question = objective.questions.find(
        (q) => q._id.toString() === questionId,
      );
      if (!question) return null;

      const metricIndex = question.metrics.findIndex(
        (m) => m._id.toString() === metricId,
      );
      if (metricIndex === -1) return null;

      Object.keys(metric).forEach((key) => {
        // Don't update _id or measurements (measurements should use dedicated endpoints)
        if (key !== '_id' && key !== 'measurements') {
          (question.metrics[metricIndex] as any)[key] =
            metric[key as keyof Metric];
        }
      });

      plan.markModified('objectives');
      return await plan.save();
    } catch (error) {
      return this.handleError('updateMetric', error, null);
    }
  }

  async deleteMetric(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId) ||
        !Types.ObjectId.isValid(metricId)
      ) {
        this.logger.warn(`Invalid ObjectId format in deleteMetric`);
        return null;
      }

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return null;

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) return null;

      const question = objective.questions.find(
        (q) => q._id.toString() === questionId,
      );
      if (!question) return null;

      question.metrics = question.metrics.filter(
        (m) => m._id.toString() !== metricId,
      );
      plan.markModified('objectives');
      return await plan.save();
    } catch (error) {
      return this.handleError('deleteMetric', error, null);
    }
  }

  // Nested entity operations - Measurements
  async addMeasurement(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    measurement: Partial<Measurement>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId) ||
        !Types.ObjectId.isValid(metricId)
      ) {
        this.logger.warn(`Invalid ObjectId format in addMeasurement`);
        return null;
      }

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return null;

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) return null;

      const question = objective.questions.find(
        (q) => q._id.toString() === questionId,
      );
      if (!question) return null;

      const metric = question.metrics.find(
        (m) => m._id.toString() === metricId,
      );
      if (!metric) return null;

      const newMeasurement = {
        ...measurement,
        _id: new Types.ObjectId(),
      };

      metric.measurements.push(newMeasurement as Measurement);
      plan.markModified('objectives');
      return await plan.save();
    } catch (error) {
      return this.handleError('addMeasurement', error, null);
    }
  }

  async updateMeasurement(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    measurementId: string,
    measurement: Partial<Measurement>,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId) ||
        !Types.ObjectId.isValid(metricId) ||
        !Types.ObjectId.isValid(measurementId)
      ) {
        this.logger.warn(`Invalid ObjectId format in updateMeasurement`);
        return null;
      }

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return null;

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) return null;

      const question = objective.questions.find(
        (q) => q._id.toString() === questionId,
      );
      if (!question) return null;

      const metric = question.metrics.find(
        (m) => m._id.toString() === metricId,
      );
      if (!metric) return null;

      const measurementIndex = metric.measurements.findIndex(
        (m) => m._id.toString() === measurementId,
      );
      if (measurementIndex === -1) return null;

      Object.keys(measurement).forEach((key) => {
        if (key !== '_id') {
          (metric.measurements[measurementIndex] as any)[key] =
            measurement[key as keyof Measurement];
        }
      });

      plan.markModified('objectives');
      return await plan.save();
    } catch (error) {
      return this.handleError('updateMeasurement', error, null);
    }
  }

  async deleteMeasurement(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    measurementId: string,
  ): Promise<MeasurementPlan | null> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId) ||
        !Types.ObjectId.isValid(metricId) ||
        !Types.ObjectId.isValid(measurementId)
      ) {
        this.logger.warn(`Invalid ObjectId format in deleteMeasurement`);
        return null;
      }

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return null;

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) return null;

      const question = objective.questions.find(
        (q) => q._id.toString() === questionId,
      );
      if (!question) return null;

      const metric = question.metrics.find(
        (m) => m._id.toString() === metricId,
      );
      if (!metric) return null;

      metric.measurements = metric.measurements.filter(
        (m) => m._id.toString() !== measurementId,
      );
      plan.markModified('objectives');
      return await plan.save();
    } catch (error) {
      return this.handleError('deleteMeasurement', error, null);
    }
  }

  // Aggregation queries for statistics
  async getPlanStatistics(planId: string): Promise<{
    objectivesCount: number;
    questionsCount: number;
    metricsCount: number;
    measurementsCount: number;
  } | null> {
    try {
      if (!Types.ObjectId.isValid(planId)) {
        this.logger.warn(
          `Invalid ObjectId format in getPlanStatistics: ${planId}`,
        );
        return null;
      }

      const result = await this.measurementPlanModel.aggregate([
        { $match: { _id: new Types.ObjectId(planId) } },
        { $unwind: { path: '$objectives', preserveNullAndEmptyArrays: true } },
        {
          $unwind: {
            path: '$objectives.questions',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$objectives.questions.metrics',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$objectives.questions.metrics.measurements',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: '$_id',
            objectivesCount: { $addToSet: '$objectives._id' },
            questionsCount: { $addToSet: '$objectives.questions._id' },
            metricsCount: { $addToSet: '$objectives.questions.metrics._id' },
            measurementsCount: {
              $addToSet: '$objectives.questions.metrics.measurements._id',
            },
          },
        },
        {
          $project: {
            objectivesCount: {
              $size: {
                $filter: {
                  input: '$objectivesCount',
                  as: 'item',
                  cond: { $ne: ['$$item', null] },
                },
              },
            },
            questionsCount: {
              $size: {
                $filter: {
                  input: '$questionsCount',
                  as: 'item',
                  cond: { $ne: ['$$item', null] },
                },
              },
            },
            metricsCount: {
              $size: {
                $filter: {
                  input: '$metricsCount',
                  as: 'item',
                  cond: { $ne: ['$$item', null] },
                },
              },
            },
            measurementsCount: {
              $size: {
                $filter: {
                  input: '$measurementsCount',
                  as: 'item',
                  cond: { $ne: ['$$item', null] },
                },
              },
            },
          },
        },
      ]);

      return result.length > 0
        ? result[0]
        : {
            objectivesCount: 0,
            questionsCount: 0,
            metricsCount: 0,
            measurementsCount: 0,
          };
    } catch (error) {
      return this.handleError('getPlanStatistics', error, null);
    }
  }

  // Pagination and filtering
  async findWithPagination(
    organizationId: string,
    page: number,
    limit: number,
    filters?: {
      status?: string;
      projectId?: string;
      search?: string;
    },
  ): Promise<{
    data: MeasurementPlan[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      if (!Types.ObjectId.isValid(organizationId)) {
        this.logger.warn(
          `Invalid ObjectId format in findWithPagination: ${organizationId}`,
        );
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const query: any = { organizationId: new Types.ObjectId(organizationId) };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.projectId && Types.ObjectId.isValid(filters.projectId)) {
        query.associatedProject = filters.projectId;
      }

      if (filters?.search) {
        query.$text = { $search: filters.search };
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.measurementPlanModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.measurementPlanModel.countDocuments(query).exec(),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return this.handleError('findWithPagination', error, {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }
  }

  // Business rule validations
  async validateUniqueMetricMnemonic(
    planId: string,
    mnemonic: string,
    excludeMetricId?: string,
  ): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(planId)) {
        return false;
      }

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return true;

      for (const objective of plan.objectives) {
        for (const question of objective.questions) {
          for (const metric of question.metrics) {
            if (
              metric.metricMnemonic === mnemonic &&
              (!excludeMetricId || metric._id.toString() !== excludeMetricId)
            ) {
              return false;
            }
          }
        }
      }

      return true;
    } catch (error) {
      return this.handleError('validateUniqueMetricMnemonic', error, true);
    }
  }

  async validateUniqueMeasurementAcronym(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    acronym: string,
    excludeMeasurementId?: string,
  ): Promise<boolean> {
    try {
      if (
        !Types.ObjectId.isValid(planId) ||
        !Types.ObjectId.isValid(objectiveId) ||
        !Types.ObjectId.isValid(questionId) ||
        !Types.ObjectId.isValid(metricId)
      ) {
        return false;
      }

      const plan = await this.measurementPlanModel.findById(planId);
      if (!plan) return true;

      const objective = plan.objectives.find(
        (obj) => obj._id.toString() === objectiveId,
      );
      if (!objective) return true;

      const question = objective.questions.find(
        (q) => q._id.toString() === questionId,
      );
      if (!question) return true;

      const metric = question.metrics.find(
        (m) => m._id.toString() === metricId,
      );
      if (!metric) return true;

      for (const measurement of metric.measurements) {
        if (
          measurement.measurementAcronym === acronym &&
          (!excludeMeasurementId ||
            measurement._id.toString() !== excludeMeasurementId)
        ) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return this.handleError('validateUniqueMeasurementAcronym', error, true);
    }
  }
}
