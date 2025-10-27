import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { evaluate } from 'mathjs';
import { MeasurementPlanRepository } from '@infrastructure/repositories/measurement-plans/measurement-plan.repository';
import { MeasurementDataRepository } from '@infrastructure/repositories/measurement-plans/measurement-data.repository';
import { MeasurementCycleRepository } from '@infrastructure/repositories/measurement-plans/measurement-cycle.repository';
import {
  AggregationCall,
  MetricCalculationResultDto,
  CycleMeasurementsResponseDto,
  MeasurementWithAcronymDto,
  FormulaValidationDto,
} from '../dtos/metric-calculation.dto';
import { Measurement, Metric, MeasurementPlan } from '@domain/measurement-plans/entities/measurement-plan.entity';

@Injectable()
export class MetricCalculationService {
  constructor(
    private readonly planRepository: MeasurementPlanRepository,
    private readonly dataRepository: MeasurementDataRepository,
    private readonly cycleRepository: MeasurementCycleRepository,
  ) {}

  /**
   * Calculate metric value for a specific cycle
   */
  async calculateMetricForCycle(
    planId: string,
    metricId: string,
    cycleId: string,
  ): Promise<MetricCalculationResultDto> {
    // 1. Get plan and validate metric exists
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    const metric = this.findMetricById(plan, metricId);
    if (!metric) {
      throw new NotFoundException('Metric not found');
    }

    // 2. Get cycle info
    const cycle = await this.cycleRepository.findById(cycleId);
    if (!cycle || cycle.planId.toString() !== planId) {
      throw new NotFoundException('Cycle not found');
    }

    // 3. Extract aggregations from formula
    const aggregations = this.extractAggregations(metric.metricFormula);

    // 4. Fetch measurement data for each acronym
    const measurementData = await this.fetchMeasurementData(
      cycleId,
      metricId,
      aggregations,
      plan,
    );

    // 5. Calculate aggregations
    const calculatedValues = this.calculateAggregations(
      aggregations,
      measurementData,
    );

    // 6. Evaluate formula
    const result = this.evaluateFormula(
      metric.metricFormula,
      calculatedValues,
    );

    return {
      metricName: metric.metricName,
      metricFormula: metric.metricFormula,
      calculatedValue: result,
      variables: calculatedValues,
      cycle: {
        _id: cycle._id.toString(),
        cycleName: cycle.cycleName,
      },
    };
  }

  /**
   * Get measurements with acronyms for a metric in a cycle
   */
  async getMeasurementsWithAcronyms(
    planId: string,
    cycleId: string,
    metricId: string,
  ): Promise<CycleMeasurementsResponseDto> {
    // Get plan and validate metric
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Measurement plan not found');
    }

    const metric = this.findMetricById(plan, metricId);
    if (!metric) {
      throw new NotFoundException('Metric not found');
    }

    // Get cycle
    const cycle = await this.cycleRepository.findById(cycleId);
    if (!cycle || cycle.planId.toString() !== planId) {
      throw new NotFoundException('Cycle not found');
    }

    // Build measurements array with acronyms
    const measurements: MeasurementWithAcronymDto[] = [];

    for (const measurement of metric.measurements) {
      // Find all measurement data for this definition in this cycle
      const measurementDataList = await this.dataRepository.find({
        cycleId: new Types.ObjectId(cycleId),
        metricId: new Types.ObjectId(metricId),
        measurementDefinitionId: measurement._id,
      });

      measurements.push({
        measurementDefinitionId: measurement._id.toString(),
        measurementAcronym: measurement.measurementAcronym,
        measurementEntity: measurement.measurementEntity,
        collectedValues: measurementDataList.map((md) => ({
          _id: md._id.toString(),
          value: md.value,
          date: md.date,
          notes: md.notes,
        })),
      });
    }

    return {
      metricId: metric._id.toString(),
      metricName: metric.metricName,
      metricFormula: metric.metricFormula,
      cycle: {
        _id: cycle._id.toString(),
        cycleName: cycle.cycleName,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      },
      measurements,
    };
  }

  /**
   * Validate a metric formula
   */
  validateFormula(formula: string): FormulaValidationDto {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check for nested operations inside aggregations
    const nestedOpsPattern = /\w+\s*[\*\/\+\-]\s*\w+\s*\)/;
    if (nestedOpsPattern.test(formula)) {
      errors.push(
        'Nested operations inside aggregations are not supported (e.g., sum(A * B))',
      );
      suggestions.push(
        'Create a pre-calculated measurement for the product (e.g., A_TIMES_B)',
      );
    }

    // Check for conditional aggregations (exclude nullIf function)
    // First, remove nullIf variations from the formula before checking
    const formulaWithoutNullIf = formula.replace(/null(if|If|IF)\s*\(/gi, '');

    // Now check for conditional keywords
    if (/(WHERE|where|WHEN|when|\bIF\b|\bif\b)/.test(formulaWithoutNullIf)) {
      errors.push(
        'Conditional aggregations are not supported (e.g., avg(X WHERE X > 60))',
      );
      suggestions.push('Create separate measurements for filtered values');
    }

    // Check for nested aggregations
    const nestedAggPattern =
      /\b(sum|avg|count|min|max)\s*\(\s*(sum|avg|count|min|max)/i;
    if (nestedAggPattern.test(formula)) {
      errors.push(
        'Nested aggregations are not supported (e.g., sum(avg(X)))',
      );
      suggestions.push('Use appropriate measurement granularity instead');
    }

    // Check that aggregation functions are valid
    const aggregations = this.extractAggregations(formula);
    const validFunctions = ['sum', 'avg', 'count', 'min', 'max'];
    for (const agg of aggregations) {
      if (!validFunctions.includes(agg.function.toLowerCase())) {
        errors.push(`Unknown aggregation function: ${agg.function}`);
        suggestions.push(
          `Supported functions are: ${validFunctions.join(', ')}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Extract aggregation calls from a formula
   */
  private extractAggregations(formula: string): AggregationCall[] {
    // Extract right-hand side only (after '=')
    // This prevents extracting the result variable from the left side
    const rhs = formula.includes('=')
      ? formula.split('=').slice(1).join('=').trim()
      : formula;

    // Extract acronyms from aggregation functions (sum, avg, count, min, max, median)
    const aggregationRegex = /(sum|avg|count|min|max|median)\s*\(\s*([A-Z][A-Z0-9_]*)\s*\)/gi;
    const aggregationMatches = [...rhs.matchAll(aggregationRegex)];

    const aggregations = aggregationMatches.map((m) => ({
      function: m[1].toLowerCase(),
      acronym: m[2],
      fullMatch: m[0],
    }));

    // Also extract naked acronyms (not inside aggregation functions)
    // Pattern: uppercase letter followed by optional uppercase letters, numbers, or underscores
    const nakedAcronymRegex = /\b([A-Z][A-Z0-9_]*)\b/g;
    const allMatches = [...rhs.matchAll(nakedAcronymRegex)];

    // Keywords to exclude from naked acronym extraction
    const excludedKeywords = [
      'SUM',
      'AVG',
      'COUNT',
      'MIN',
      'MAX',
      'MEDIAN',
      'NULLIF',
      'WHERE',
      'IF',
      'OR',
      'AND',
      'NOT',
      'NAN',
    ];

    allMatches.forEach((m) => {
      const acronym = m[1];

      // Skip if it's a function keyword
      if (excludedKeywords.includes(acronym.toUpperCase())) {
        return;
      }

      // Skip if already captured in aggregations
      if (aggregations.some((agg) => agg.acronym === acronym)) {
        return;
      }

      // Add as identity aggregation (returns latest value)
      aggregations.push({
        function: 'identity',
        acronym: acronym,
        fullMatch: acronym,
      });
    });

    return aggregations;
  }

  /**
   * Fetch measurement data for all acronyms in aggregations
   */
  private async fetchMeasurementData(
    cycleId: string,
    metricId: string,
    aggregations: AggregationCall[],
    plan: MeasurementPlan,
  ): Promise<Record<string, number[]>> {
    const data: Record<string, number[]> = {};

    // Get metric from plan
    const metric = this.findMetricById(plan, metricId);
    if (!metric) {
      throw new NotFoundException('Metric not found');
    }

    for (const agg of aggregations) {
      // Find measurement definition by acronym with smart matching
      // Supports prefix/suffix matching: ESF_H matches ESF, ESF matches ESF_H
      const measurementDef = metric.measurements.find((m) => {
        const measurementAcronym = m.measurementAcronym;
        const formulaAcronym = agg.acronym;

        // Exact match
        if (measurementAcronym === formulaAcronym) {
          return true;
        }

        // Prefix match: ESF_H in formula matches ESF in measurement
        if (formulaAcronym.startsWith(measurementAcronym + '_')) {
          return true;
        }

        // Suffix match: ESF in formula matches ESF_H in measurement
        if (measurementAcronym.startsWith(formulaAcronym + '_')) {
          return true;
        }

        return false;
      });

      if (!measurementDef) {
        // If acronym not found, return empty array
        data[agg.acronym] = [];
        continue;
      }

      // Query all measurement data for this definition in this cycle
      const measurementDataList = await this.dataRepository.find({
        cycleId: new Types.ObjectId(cycleId),
        metricId: new Types.ObjectId(metricId),
        measurementDefinitionId: measurementDef._id,
      });

      data[agg.acronym] = measurementDataList.map((md) => md.value);
    }

    return data;
  }

  /**
   * Calculate aggregation values
   */
  private calculateAggregations(
    aggregations: AggregationCall[],
    measurementData: Record<string, number[]>,
  ): Record<string, number> {
    const result: Record<string, number> = {};
    const missingAcronyms: string[] = [];

    // First pass: Check for ALL missing measurements
    for (const agg of aggregations) {
      const values = measurementData[agg.acronym] || [];

      // Track missing measurements (empty arrays indicate missing data)
      if (values.length === 0) {
        missingAcronyms.push(agg.acronym);
      }
    }

    // If any measurements are missing, throw error with ALL missing acronyms
    if (missingAcronyms.length > 0) {
      throw new BadRequestException(
        `Missing measurement data for: ${missingAcronyms.join(', ')}. Please add measurement data for these acronyms in this cycle.`,
      );
    }

    // Second pass: Calculate aggregations (we know all data exists now)
    for (const agg of aggregations) {
      const values = measurementData[agg.acronym] || [];

      result[agg.fullMatch] = this.applyAggregation(
        agg.function,
        values,
        agg.acronym,
      );
    }

    return result;
  }

  /**
   * Apply aggregation function to values
   */
  private applyAggregation(
    func: string,
    values: number[],
    acronym?: string,
  ): number {
    // Special handling for identity - must have data
    if (func.toLowerCase() === 'identity') {
      if (values.length === 0) {
        throw new BadRequestException(
          acronym
            ? `Missing measurement data for: ${acronym}. Please add measurement data for this acronym in this cycle.`
            : `No measurement data found. Please add measurement data for this cycle before calculating metrics.`,
        );
      }
      return values[values.length - 1];
    }

    // For other aggregations, empty array returns 0
    if (values.length === 0) {
      return 0;
    }

    switch (func.toLowerCase()) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'median':
        // Sort values and find middle element
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      default:
        throw new BadRequestException(`Unknown aggregation function: ${func}`);
    }
  }

  /**
   * Evaluate formula with calculated values
   */
  private evaluateFormula(
    formula: string,
    calculatedValues: Record<string, number>,
  ): number | null {
    try {
      // Extract right-hand side after '='
      const rhs = formula.includes('=')
        ? formula.split('=')[1].trim()
        : formula;

      // Substitute calculated values
      let expression = rhs;
      for (const [placeholder, value] of Object.entries(calculatedValues)) {
        // Escape special regex characters in placeholder
        const escapedPlaceholder = placeholder.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );
        expression = expression.replace(
          new RegExp(escapedPlaceholder, 'g'),
          String(value),
        );
      }

      // Replace nullIf with conditional that returns NaN instead of null
      // This prevents mathjs from failing on null in division
      // nullif(x, 0) becomes: (x == 0 ? NaN : x)
      const processedExpression = expression.replace(
        /(nullif|nullIf|NULLIF)\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
        '(($2) == ($3) ? NaN : ($2))',
      );

      // Evaluate using math.js
      const result = evaluate(processedExpression);

      // Handle NaN, null, undefined results
      if (result === null || result === undefined || isNaN(result)) {
        return null;
      }

      return typeof result === 'number' ? result : Number(result);
    } catch (error) {
      // If error is related to division or null, return null gracefully
      if (
        error.message.includes('null') ||
        error.message.includes('divide') ||
        error.message.includes('Unexpected type')
      ) {
        return null;
      }
      throw new BadRequestException(
        `Formula evaluation failed: ${error.message}`,
      );
    }
  }

  /**
   * Find metric by ID in measurement plan
   */
  private findMetricById(plan: MeasurementPlan, metricId: string): Metric | null {
    for (const objective of plan.objectives) {
      for (const question of objective.questions) {
        const metric = question.metrics.find(
          (m) => m._id.toString() === metricId,
        );
        if (metric) {
          return metric;
        }
      }
    }
    return null;
  }
}
