import { Injectable, NotFoundException } from '@nestjs/common';
import { MeasurementDataRepository } from '@infrastructure/repositories/measurement-plans/measurement-data.repository';
import { MeasurementPlanRepository } from '@infrastructure/repositories/measurement-plans/measurement-plan.repository';
import { Metric } from '@domain/measurement-plans/entities/measurement-plan.entity';
import { MetricStatusDto, PlanStatusDto } from '../dtos';

@Injectable()
export class StatusService {
  constructor(
    private readonly dataRepository: MeasurementDataRepository,
    private readonly planRepository: MeasurementPlanRepository,
  ) {}

  async getMetricStatus(
    planId: string,
    metricId: string,
  ): Promise<MetricStatusDto> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    let metric: Metric | null = null;
    for (const obj of plan.objectives) {
      for (const q of obj.questions) {
        const found = q.metrics.find((m) => m._id.toString() === metricId);
        if (found) {
          metric = found;
          break;
        }
      }
      if (metric) break;
    }

    if (!metric) {
      throw new NotFoundException('Metric not found');
    }

    const measurements = await this.dataRepository.findByMetricId(metricId);
    const [min, max] = metric.metricControlRange;

    let withinRange = 0;
    let outOfRange = 0;

    measurements.forEach((m) => {
      if (m.value >= min && m.value <= max) {
        withinRange++;
      } else {
        outOfRange++;
      }
    });

    const latestValue =
      measurements.length > 0 ? measurements[0].value : undefined;

    return {
      status: outOfRange === 0 ? 'OK' : 'NEEDS_ATTENTION',
      withinRange,
      outOfRange,
      totalMeasurements: measurements.length,
      controlRange: [min, max],
      latestValue,
    };
  }

  async getPlanStatus(planId: string): Promise<PlanStatusDto> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    const metricIds: string[] = [];
    for (const obj of plan.objectives) {
      for (const q of obj.questions) {
        for (const m of q.metrics) {
          metricIds.push(m._id.toString());
        }
      }
    }

    let metricsOk = 0;
    let metricsNeedAttention = 0;

    for (const metricId of metricIds) {
      const status = await this.getMetricStatus(planId, metricId);
      if (status.status === 'OK') {
        metricsOk++;
      } else {
        metricsNeedAttention++;
      }
    }

    return {
      overallStatus: metricsNeedAttention === 0 ? 'OK' : 'NEEDS_ATTENTION',
      metricsOk,
      metricsNeedAttention,
      totalMetrics: metricIds.length,
    };
  }
}
