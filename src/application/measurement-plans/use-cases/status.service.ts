import { Injectable, NotFoundException } from '@nestjs/common';
import { MeasurementPlanRepository } from '@infrastructure/repositories/measurement-plans/measurement-plan.repository';
import { MeasurementCycleRepository } from '@infrastructure/repositories/measurement-plans/measurement-cycle.repository';
import { Metric } from '@domain/measurement-plans/entities/measurement-plan.entity';
import { MetricStatusDto, PlanStatusDto } from '../dtos';
import { MetricCalculationService } from './metric-calculation.service';

@Injectable()
export class StatusService {
  constructor(
    private readonly planRepository: MeasurementPlanRepository,
    private readonly cycleRepository: MeasurementCycleRepository,
    private readonly calculationService: MetricCalculationService,
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

    // Skip metrics without formula or control range
    if (!metric.metricFormula || !metric.metricControlRange) {
      return {
        status: 'OK',
        withinRange: 0,
        outOfRange: 0,
        totalMeasurements: 0,
        controlRange: [0, 0],
        latestValue: undefined,
      };
    }

    const [min, max] = metric.metricControlRange;

    // Get all cycles for this plan
    const cycles = await this.cycleRepository.findByPlanId(planId);

    let withinRange = 0;
    let outOfRange = 0;
    let latestValue: number | undefined = undefined;
    let totalCalculations = 0;

    // Calculate metric for each cycle and check against control range
    for (const cycle of cycles) {
      try {
        const calculation = await this.calculationService.calculateMetricForCycle(
          planId,
          metricId,
          cycle._id.toString(),
        );

        if (calculation.calculatedValue !== null && calculation.calculatedValue !== undefined) {
          totalCalculations++;
          latestValue = calculation.calculatedValue; // Keep updating with latest

          // Check if calculated value is within control range
          if (calculation.calculatedValue >= min && calculation.calculatedValue <= max) {
            withinRange++;
          } else {
            outOfRange++;
          }
        }
      } catch (error) {
        // Skip cycles with missing data or calculation errors
        continue;
      }
    }

    return {
      status: outOfRange === 0 && totalCalculations > 0 ? 'OK' : 'NEEDS_ATTENTION',
      withinRange,
      outOfRange,
      totalMeasurements: totalCalculations,
      controlRange: [min, max],
      latestValue,
    };
  }

  async getPlanStatus(planId: string): Promise<PlanStatusDto> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    // Get all metrics with formulas and control ranges
    const metricsWithRanges: { id: string; metric: Metric }[] = [];
    for (const obj of plan.objectives) {
      for (const q of obj.questions) {
        for (const m of q.metrics) {
          // Only include metrics that have both formula and control range
          if (m.metricFormula && m.metricControlRange) {
            metricsWithRanges.push({ id: m._id.toString(), metric: m });
          }
        }
      }
    }

    let metricsOk = 0;
    let metricsNeedAttention = 0;

    for (const { id: metricId } of metricsWithRanges) {
      const status = await this.getMetricStatus(planId, metricId);
      if (status.status === 'OK') {
        metricsOk++;
      } else {
        metricsNeedAttention++;
      }
    }

    // Determine overall status:
    // - If no metrics with control ranges exist, status is OK (nothing to monitor)
    // - If all metrics are OK, status is OK
    // - Otherwise, status is NEEDS_ATTENTION
    let overallStatus: 'OK' | 'NEEDS_ATTENTION' = 'OK';
    if (metricsWithRanges.length > 0 && metricsNeedAttention > 0) {
      overallStatus = 'NEEDS_ATTENTION';
    }

    return {
      overallStatus,
      metricsOk,
      metricsNeedAttention,
      totalMetrics: metricsWithRanges.length,
    };
  }
}
