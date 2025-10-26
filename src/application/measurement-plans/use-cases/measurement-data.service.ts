import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { MeasurementDataRepository } from '@infrastructure/repositories/measurement-plans/measurement-data.repository';
import { MeasurementCycleRepository } from '@infrastructure/repositories/measurement-plans/measurement-cycle.repository';
import { MeasurementPlanRepository } from '@infrastructure/repositories/measurement-plans/measurement-plan.repository';
import {
  CreateMeasurementDataDto,
  UpdateMeasurementDataDto,
} from '../dtos';

@Injectable()
export class MeasurementDataService {
  constructor(
    private readonly dataRepository: MeasurementDataRepository,
    private readonly cycleRepository: MeasurementCycleRepository,
    private readonly planRepository: MeasurementPlanRepository,
  ) {}

  async create(
    planId: string,
    objectiveId: string,
    questionId: string,
    metricId: string,
    dto: CreateMeasurementDataDto,
    userId: string,
  ) {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    const cycle = await this.cycleRepository.findById(dto.cycleId);
    if (!cycle || cycle.planId.toString() !== planId) {
      throw new NotFoundException('Cycle not found');
    }

    const objective = plan.objectives.find(
      (o) => o._id.toString() === objectiveId,
    );
    if (!objective) {
      throw new NotFoundException('Objective not found');
    }

    const question = objective.questions.find(
      (q) => q._id.toString() === questionId,
    );
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const metric = question.metrics.find((m) => m._id.toString() === metricId);
    if (!metric) {
      throw new NotFoundException('Metric not found');
    }

    const measurementDef = metric.measurements.find(
      (m) => m._id.toString() === dto.measurementDefinitionId,
    );
    if (!measurementDef) {
      throw new NotFoundException('Measurement definition not found');
    }

    const measurementDate = new Date(dto.date);
    if (
      measurementDate < cycle.startDate ||
      measurementDate > cycle.endDate
    ) {
      throw new BadRequestException(
        `Measurement date ${dto.date} is outside cycle range (${cycle.startDate.toISOString()} to ${cycle.endDate.toISOString()})`,
      );
    }

    return this.dataRepository.create({
      planId: new Types.ObjectId(planId),
      cycleId: new Types.ObjectId(dto.cycleId),
      objectiveId: new Types.ObjectId(objectiveId),
      questionId: new Types.ObjectId(questionId),
      metricId: new Types.ObjectId(metricId),
      measurementDefinitionId: new Types.ObjectId(dto.measurementDefinitionId),
      value: dto.value,
      date: measurementDate,
      notes: dto.notes,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async update(
    planId: string,
    measurementDataId: string,
    dto: UpdateMeasurementDataDto,
  ) {
    const data = await this.dataRepository.findById(measurementDataId);
    if (!data || data.planId.toString() !== planId) {
      throw new NotFoundException('Measurement data not found');
    }

    const updateData: any = {};
    if (dto.value !== undefined) updateData.value = dto.value;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.date) {
      const cycle = await this.cycleRepository.findById(
        data.cycleId.toString(),
      );

      if (!cycle) {
        throw new NotFoundException('Cycle not found');
      }

      const measurementDate = new Date(dto.date);

      if (
        measurementDate < cycle.startDate ||
        measurementDate > cycle.endDate
      ) {
        throw new BadRequestException(
          `Measurement date ${dto.date} is outside cycle range (${cycle.startDate.toISOString()} to ${cycle.endDate.toISOString()})`,
        );
      }

      updateData.date = measurementDate;
    }

    return this.dataRepository.update(measurementDataId, updateData);
  }

  async delete(planId: string, measurementDataId: string) {
    const data = await this.dataRepository.findById(measurementDataId);
    if (!data || data.planId.toString() !== planId) {
      throw new NotFoundException('Measurement data not found');
    }

    await this.dataRepository.delete(measurementDataId);
  }
}
