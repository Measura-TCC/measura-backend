import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { MeasurementCycleRepository } from '@infrastructure/repositories/measurement-plans/measurement-cycle.repository';
import { MeasurementDataRepository } from '@infrastructure/repositories/measurement-plans/measurement-data.repository';
import { MeasurementPlanRepository } from '@infrastructure/repositories/measurement-plans/measurement-plan.repository';
import {
  CreateCycleDto,
  UpdateCycleDto,
  CycleWithMeasurementsDto,
} from '../dtos';

@Injectable()
export class CycleService {
  constructor(
    private readonly cycleRepository: MeasurementCycleRepository,
    private readonly dataRepository: MeasurementDataRepository,
    private readonly planRepository: MeasurementPlanRepository,
  ) {}

  async create(
    planId: string,
    dto: CreateCycleDto,
    userId: string,
  ) {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const existing = await this.cycleRepository.findByPlanAndName(
      planId,
      dto.cycleName,
    );
    if (existing) {
      throw new ConflictException(
        'A cycle with this name already exists in this plan',
      );
    }

    return this.cycleRepository.create({
      planId: new Types.ObjectId(planId),
      cycleName: dto.cycleName,
      startDate,
      endDate,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async findAll(planId: string) {
    return this.cycleRepository.findByPlanId(planId);
  }

  async findOne(planId: string, cycleId: string) {
    const cycle = await this.cycleRepository.findById(cycleId);
    if (!cycle || cycle.planId.toString() !== planId) {
      throw new NotFoundException('Cycle not found');
    }
    return cycle;
  }

  async update(
    planId: string,
    cycleId: string,
    dto: UpdateCycleDto,
  ) {
    const cycle = await this.findOne(planId, cycleId);

    const updateData: any = {};
    if (dto.cycleName) updateData.cycleName = dto.cycleName;
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    if (updateData.startDate && updateData.endDate) {
      if (updateData.endDate <= updateData.startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.cycleRepository.update(cycleId, updateData);
  }

  async delete(planId: string, cycleId: string) {
    const cycle = await this.findOne(planId, cycleId);

    const measurementCount = await this.dataRepository.countByCycleId(cycleId);
    if (measurementCount > 0) {
      throw new ConflictException(
        `Cannot delete cycle with ${measurementCount} existing measurements`,
      );
    }

    await this.cycleRepository.delete(cycleId);
  }

  async getCycleWithMeasurements(
    planId: string,
    cycleId: string,
  ): Promise<CycleWithMeasurementsDto> {
    const cycle = await this.findOne(planId, cycleId);
    const measurements = await this.dataRepository.findByCycleId(cycleId);
    const plan = await this.planRepository.findById(planId);

    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    const enrichedMeasurements = measurements.map((m) => {
      const objective = plan.objectives.find(
        (o) => o._id.toString() === m.objectiveId.toString(),
      );
      const question = objective?.questions.find(
        (q) => q._id.toString() === m.questionId.toString(),
      );
      const metric = question?.metrics.find(
        (mt) => mt._id.toString() === m.metricId.toString(),
      );
      const measurement = metric?.measurements.find(
        (ms) => ms._id.toString() === m.measurementDefinitionId.toString(),
      );

      return {
        _id: m._id.toString(),
        measurementDefinitionName: measurement?.measurementEntity || '',
        measurementAcronym: measurement?.measurementAcronym || '',
        metricName: metric?.metricName || '',
        objectiveTitle: objective?.objectiveTitle || '',
        questionText: question?.questionText || '',
        value: m.value,
        date: m.date,
        notes: m.notes,
      };
    });

    return {
      cycle: {
        _id: cycle._id.toString(),
        cycleName: cycle.cycleName,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      },
      measurements: enrichedMeasurements,
      measurementCount: enrichedMeasurements.length,
    };
  }

  async getAllCyclesWithMeasurements(
    planId: string,
  ): Promise<CycleWithMeasurementsDto[]> {
    const cycles = await this.cycleRepository.findByPlanId(planId);

    const result: CycleWithMeasurementsDto[] = [];
    for (const cycle of cycles) {
      const cycleData = await this.getCycleWithMeasurements(
        planId,
        cycle._id.toString(),
      );
      result.push(cycleData);
    }

    return result;
  }
}
