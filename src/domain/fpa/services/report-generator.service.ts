import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Estimate } from '@domain/fpa/entities/estimate.entity';
import { FunctionPointCalculator } from '@domain/fpa/services/function-point-calculator.service';
import { TeamSizeEstimationService } from '@domain/fpa/services/team-size-estimation.service';
import {
  TrendAnalysisService,
  TrendMetric,
} from '@domain/fpa/services/trend-analysis.service';

export interface DetailedReportSection {
  title: string;
  content: string | string[];
}

export interface DetailedReport {
  title: string;
  date: string;
  summary: string;
  sections: DetailedReportSection[];
}

export interface SummaryReport {
  title: string;
  totalFunctionPoints: number;
  adjustedFunctionPoints: number;
  estimatedEffort: number;
  teamSize: number;
  duration: number;
  gscScore: number;
  date: string;
}

export interface ComparisonReport {
  title: string;
  date: string;
  estimates: {
    id: string;
    name: string;
    version: number;
    date: string;
    functionPoints: number;
    effort: number;
  }[];
  percentageDifferences: {
    functionPoints: number;
    effort: number;
  }[];
  trendAnalysis: {
    trend: string;
    percentageChange: number;
  };
}

@Injectable()
export class ReportGeneratorService {
  constructor(
    private readonly functionPointCalculator: FunctionPointCalculator,
    private readonly teamSizeEstimationService: TeamSizeEstimationService,
    private readonly trendAnalysisService: TrendAnalysisService,
    private readonly i18n: I18nService,
  ) {}

  private t(key: string, locale: string): string {
    return this.i18n.t(key, { lang: locale });
  }

  // Format date based on locale
  private formatDate(date: Date, locale: string): string {
    if (locale === 'pt') {
      // Brazilian format: DD/MM/YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    // Default format: YYYY-MM-DD
    return date.toISOString().split('T')[0];
  }

  // Get creator name from populated or unpopulated createdBy field
  private getCreatorName(createdBy: any): string {
    if (createdBy && typeof createdBy === 'object') {
      // Try firstName + lastName
      if (createdBy.firstName || createdBy.lastName) {
        return `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim();
      }
      // Fall back to username
      if (createdBy.username) {
        return createdBy.username;
      }
      // Fall back to email
      if (createdBy.email) {
        return createdBy.email;
      }
      // If it's an ObjectId object
      if (createdBy._id) {
        return createdBy._id.toString();
      }
    }
    // If it's just an ObjectId string
    if (typeof createdBy === 'string' || createdBy?.toString) {
      return createdBy.toString();
    }
    return 'Unknown';
  }

  // GSC translation key mapping (in order of GSC array)
  private readonly GSC_KEYS = [
    'dataCommunications',
    'distributedDataProcessing',
    'performance',
    'heavilyUsedConfiguration',
    'transactionRate',
    'onlineDataEntry',
    'endUserEfficiency',
    'onlineUpdate',
    'complexProcessing',
    'reusability',
    'installationEase',
    'operationalEase',
    'multipleSites',
    'facilitateChange',
  ];


  generateDetailedReport(estimate: Estimate, locale: string = 'en'): DetailedReport {
    // Prepare detailed GSC section with translations
    const gscDetails = this.GSC_KEYS.map((key, index) => {
      const gscValue = estimate.generalSystemCharacteristics?.[index] || 0;
      const name = this.t(`fpa-export.gsc.${key}`, locale);
      const description = this.t(`fpa-export.gsc.${key}Desc`, locale);
      return `${name} (${index + 1}): ${gscValue} - ${description}`;
    });

    // Calculate team size estimates
    const teamSizeEstimation = this.teamSizeEstimationService.estimateTeamSize({
      adjustedFunctionPoints: estimate.adjustedFunctionPoints,
      productivityFactor: estimate.productivityFactor,
      hoursPerDayPerPerson: 6, // Assuming 6 productive hours per day
    });

    // Format function point counts by component type
    const functionPointsBreakdown = [
      `${this.t('fpa-export.internalLogicalFiles', locale)}: ${estimate.internalLogicalFiles.length} ${this.t('fpa-export.components', locale)}`,
      `${this.t('fpa-export.externalInterfaceFiles', locale)}: ${estimate.externalInterfaceFiles.length} ${this.t('fpa-export.components', locale)}`,
      `${this.t('fpa-export.externalInputs', locale)}: ${estimate.externalInputs.length} ${this.t('fpa-export.components', locale)}`,
      `${this.t('fpa-export.externalOutputs', locale)}: ${estimate.externalOutputs.length} ${this.t('fpa-export.components', locale)}`,
      `${this.t('fpa-export.externalQueries', locale)}: ${estimate.externalQueries.length} ${this.t('fpa-export.components', locale)}`,
    ];

    // Calculate GSC total for formulas
    const gscTotal = estimate.generalSystemCharacteristics?.reduce((sum, val) => sum + val, 0) || 0;

    return {
      title: `${this.t('fpa-export.detailedReportTitle', locale)}: ${estimate.name}`,
      date: this.formatDate(estimate.updatedAt, locale),
      summary: estimate.description,
      sections: [
        {
          title: this.t('fpa-export.projectInformation', locale),
          content: [
            `${this.t('fpa-export.projectId', locale)}: ${estimate.projectId.toString()}`,
            `${this.t('fpa-export.status', locale)}: ${estimate.status}`,
            `${this.t('fpa-export.version', locale)}: ${estimate.version}`,
            `${this.t('fpa-export.createdBy', locale)}: ${this.getCreatorName(estimate.createdBy)}`,
          ],
        },
        {
          title: this.t('fpa-export.functionPointCounts', locale),
          content: [
            `${this.t('fpa-export.totalComponentCount', locale)}: ${
              estimate.internalLogicalFiles.length +
              estimate.externalInterfaceFiles.length +
              estimate.externalInputs.length +
              estimate.externalOutputs.length +
              estimate.externalQueries.length
            }`,
            ...functionPointsBreakdown,
            `${this.t('fpa-export.unadjustedFunctionPoints', locale)}: ${estimate.unadjustedFunctionPoints}`,
            `${this.t('fpa-export.valueAdjustmentFactor', locale)}: ${estimate.valueAdjustmentFactor.toFixed(2)}`,
            `${this.t('fpa-export.adjustedFunctionPoints', locale)}: ${estimate.adjustedFunctionPoints}`,
          ],
        },
        {
          title: this.t('fpa-export.generalSystemCharacteristics', locale),
          content: gscDetails,
        },
        {
          title: this.t('fpa-export.calculationDetails', locale),
          content: [
            `${this.t('fpa-export.ufpCalculation', locale)}:`,
            `${this.t('fpa-export.ufpFormula', locale)}`,
            `${estimate.unadjustedFunctionPoints} PF`,
            '',
            `${this.t('fpa-export.vafCalculation', locale)}:`,
            `${this.t('fpa-export.vafFormula', locale)}`,
            `VAF = 0.65 + (0.01 × ${gscTotal}) = ${estimate.valueAdjustmentFactor.toFixed(2)}`,
            '',
            `${this.t('fpa-export.afpCalculation', locale)}:`,
            `${this.t('fpa-export.afpFormula', locale)}`,
            `AFP = ${estimate.unadjustedFunctionPoints} × ${estimate.valueAdjustmentFactor.toFixed(2)} = ${estimate.adjustedFunctionPoints}`,
            '',
            `${this.t('fpa-export.effortCalculation', locale)}:`,
            `${this.t('fpa-export.effortFormula', locale)}`,
            `${estimate.estimatedEffortHours} ${this.t('fpa-export.personHours', locale)} = ${estimate.adjustedFunctionPoints} × ${estimate.productivityFactor}`,
            ...(estimate.hourlyRateBRL ? [
              '',
              `${this.t('fpa-export.costCalculation', locale)}:`,
              `${this.t('fpa-export.costFormula', locale)}`,
              `R$ ${(estimate.estimatedEffortHours * estimate.hourlyRateBRL).toFixed(2)} = ${estimate.estimatedEffortHours} × R$ ${estimate.hourlyRateBRL.toFixed(2)}`,
            ] : []),
          ],
        },
        {
          title: this.t('fpa-export.effortEstimation', locale),
          content: [
            `${this.t('fpa-export.productivityFactor', locale)}: ${estimate.productivityFactor} ${this.t('fpa-export.hoursPerFunctionPoint', locale)}`,
            `${this.t('fpa-export.estimatedEffort', locale)}: ${estimate.estimatedEffortHours} ${this.t('fpa-export.personHours', locale)}`,
            `${this.t('fpa-export.estimatedEffort', locale)}: ${(estimate.estimatedEffortHours / 8).toFixed(1)} ${this.t('fpa-export.personDays', locale)}`,
            `${this.t('fpa-export.estimatedEffort', locale)}: ${(estimate.estimatedEffortHours / 8 / 21).toFixed(1)} ${this.t('fpa-export.personMonths', locale)}`,
          ],
        },
        ...(estimate.hourlyRateBRL ? [{
          title: this.t('fpa-export.costEstimation', locale),
          content: [
            `${this.t('fpa-export.hourlyRate', locale)}: R$ ${estimate.hourlyRateBRL.toFixed(2)}`,
            `${this.t('fpa-export.estimatedCost', locale)}: R$ ${(estimate.estimatedEffortHours * estimate.hourlyRateBRL).toFixed(2)}`,
          ],
        }] : []),
        {
          title: this.t('fpa-export.teamSizeAndDuration', locale),
          content: [
            `${this.t('fpa-export.recommendedTeamSize', locale)}: ${teamSizeEstimation.recommendedTeamSize} ${this.t('fpa-export.people', locale)}`,
            `${this.t('fpa-export.recommendedDuration', locale)}: ${teamSizeEstimation.recommendedDurationMonths.toFixed(1)} ${this.t('fpa-export.months', locale)}`,
            `${this.t('fpa-export.minTeamSize', locale)}: ${teamSizeEstimation.minTeamSize} ${this.t('fpa-export.people', locale)}`,
            `${this.t('fpa-export.maxTeamSize', locale)}: ${teamSizeEstimation.maxTeamSize} ${this.t('fpa-export.people', locale)}`,
            `${this.t('fpa-export.minDuration', locale)}: ${teamSizeEstimation.minDurationMonths.toFixed(1)} ${this.t('fpa-export.months', locale)}`,
            `${this.t('fpa-export.maxDuration', locale)}: ${teamSizeEstimation.maxDurationMonths.toFixed(1)} ${this.t('fpa-export.months', locale)}`,
          ],
        },
        {
          title: this.t('fpa-export.additionalNotes', locale),
          content: estimate.notes || this.t('fpa-export.noAdditionalNotes', locale),
        },
      ],
    };
  }

  generateSummaryReport(estimate: Estimate, locale: string = 'en'): SummaryReport {
    const gscTotal =
      estimate.generalSystemCharacteristics?.reduce(
        (sum, val) => sum + val,
        0,
      ) || 0;

    return {
      title: `${this.t('fpa-export.summaryReportTitle', locale)}: ${estimate.name}`,
      totalFunctionPoints: estimate.unadjustedFunctionPoints,
      adjustedFunctionPoints: estimate.adjustedFunctionPoints,
      estimatedEffort: estimate.estimatedEffortHours,
      teamSize: this.teamSizeEstimationService.estimateTeamSize({
        adjustedFunctionPoints: estimate.adjustedFunctionPoints,
        productivityFactor: estimate.productivityFactor,
        hoursPerDayPerPerson: 6,
      }).recommendedTeamSize,
      duration: this.teamSizeEstimationService.estimateTeamSize({
        adjustedFunctionPoints: estimate.adjustedFunctionPoints,
        productivityFactor: estimate.productivityFactor,
        hoursPerDayPerPerson: 6,
      }).recommendedDurationMonths,
      gscScore: gscTotal,
      date: this.formatDate(estimate.updatedAt, locale),
    };
  }

  generateComparisonReport(estimates: Estimate[], locale: string = 'en'): ComparisonReport {
    if (!estimates || estimates.length < 2) {
      throw new Error('At least two estimates are required for comparison');
    }

    // Sort estimates by version
    const sortedEstimates = [...estimates].sort(
      (a, b) => a.version - b.version,
    );

    // Prepare comparison data
    const estimatesData = sortedEstimates.map((est) => ({
      id: est._id.toString(),
      name: est.name,
      version: est.version,
      date: this.formatDate(est.updatedAt, locale),
      functionPoints: est.adjustedFunctionPoints,
      effort: est.estimatedEffortHours,
    }));

    // Calculate percentage differences between consecutive versions
    const percentageDifferences: Array<{
      functionPoints: number;
      effort: number;
    }> = [];
    for (let i = 1; i < sortedEstimates.length; i++) {
      const prev = sortedEstimates[i - 1];
      const curr = sortedEstimates[i];

      const fpDiff =
        ((curr.adjustedFunctionPoints - prev.adjustedFunctionPoints) /
          prev.adjustedFunctionPoints) *
        100;
      const effortDiff =
        ((curr.estimatedEffortHours - prev.estimatedEffortHours) /
          prev.estimatedEffortHours) *
        100;

      percentageDifferences.push({
        functionPoints: parseFloat(fpDiff.toFixed(2)),
        effort: parseFloat(effortDiff.toFixed(2)),
      });
    }

    // Perform trend analysis
    const trendResult = this.trendAnalysisService.analyzeTrend(
      sortedEstimates,
      TrendMetric.ADJUSTED_FP,
    );

    return {
      title: `${this.t('fpa-export.comparisonReportTitle', locale)}: ${sortedEstimates[0].name}`,
      date: this.formatDate(new Date(), locale),
      estimates: estimatesData,
      percentageDifferences,
      trendAnalysis: {
        trend: trendResult.trend,
        percentageChange: parseFloat(trendResult.percentageChange.toFixed(2)),
      },
    };
  }

  generateJSONExport(estimate: Estimate): string {
    // Create a clean export object without internal MongoDB details
    const exportObj = {
      name: estimate.name,
      description: estimate.description,
      status: estimate.status,
      version: estimate.version,
      createdAt: estimate.createdAt,
      updatedAt: estimate.updatedAt,
      unadjustedFunctionPoints: estimate.unadjustedFunctionPoints,
      valueAdjustmentFactor: estimate.valueAdjustmentFactor,
      adjustedFunctionPoints: estimate.adjustedFunctionPoints,
      estimatedEffortHours: estimate.estimatedEffortHours,
      productivityFactor: estimate.productivityFactor,
      generalSystemCharacteristics: estimate.generalSystemCharacteristics,
      notes: estimate.notes,
      componentCounts: {
        internalLogicalFiles: estimate.internalLogicalFiles.length,
        externalInterfaceFiles: estimate.externalInterfaceFiles.length,
        externalInputs: estimate.externalInputs.length,
        externalOutputs: estimate.externalOutputs.length,
        externalQueries: estimate.externalQueries.length,
      },
    };

    return JSON.stringify(exportObj, null, 2);
  }

  generateCSVExport(estimates: Estimate[]): string {
    // Define CSV headers
    const headers = [
      'Name',
      'Version',
      'Status',
      'Date',
      'Unadjusted FP',
      'VAF',
      'Adjusted FP',
      'Effort (hours)',
      'Productivity Factor',
      'ILF Count',
      'EIF Count',
      'EI Count',
      'EO Count',
      'EQ Count',
    ];

    // Create CSV rows
    const rows = estimates.map((est) => [
      est.name,
      est.version,
      est.status,
      est.updatedAt.toISOString().split('T')[0],
      est.unadjustedFunctionPoints,
      est.valueAdjustmentFactor,
      est.adjustedFunctionPoints,
      est.estimatedEffortHours,
      est.productivityFactor,
      est.internalLogicalFiles.length,
      est.externalInterfaceFiles.length,
      est.externalInputs.length,
      est.externalOutputs.length,
      est.externalQueries.length,
    ]);

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }
}
