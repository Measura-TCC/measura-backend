import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { I18nService } from 'nestjs-i18n';
import { MeasurementPlanService } from './measurement-plan.service';
import { MeasurementCycleRepository } from '@infrastructure/repositories/measurement-plans/measurement-cycle.repository';
import { MetricCalculationService } from './metric-calculation.service';
import { ExportFormat, ExportOptionsDto, ChartImageDto } from '../dtos/export.dto';

@Injectable()
export class ExportService {
  constructor(
    private readonly measurementPlanService: MeasurementPlanService,
    private readonly cycleRepository: MeasurementCycleRepository,
    private readonly metricCalculationService: MetricCalculationService,
    private readonly i18n: I18nService,
  ) {
    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
  }

  private async enrichPlanData(
    planData: any,
    planId: string,
    options?: ExportOptionsDto,
    chartImages?: ChartImageDto[],
  ): Promise<any> {
    const enrichedData = { ...planData };

    // Map frontend flags to backend behavior:
    // includeMeasurements -> fetch cycles and monitoring data
    // includeAnalysis -> fetch calculations
    const shouldIncludeCycles = options?.includeCycles || options?.includeMeasurements;
    const shouldIncludeMonitoring = options?.includeMonitoring || options?.includeMeasurements;
    const shouldIncludeCalculations = options?.includeCalculations || options?.includeAnalysis;

    // Fetch cycles if requested
    if (shouldIncludeCycles) {
      const cycles = await this.cycleRepository.findByPlanId(planId);
      enrichedData.cycles = await Promise.all(
        cycles.map(async (cycle) => ({
          _id: cycle._id.toString(),
          name: cycle.cycleName,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          measurementCount: await this.cycleRepository.countMeasurementsByCycleId(
            cycle._id.toString(),
          ),
        })),
      );
    }

    // Fetch monitoring data if requested
    if (shouldIncludeMonitoring) {
      const measurementData = await this.cycleRepository.getMeasurementDataByPlanId(planId);
      enrichedData.monitoringData = measurementData;

      // Calculate statistics
      enrichedData.monitoringStats = {
        totalMeasurements: measurementData.length,
        uniqueMetrics: new Set(measurementData.map((m: any) => m.metricId.toString())).size,
        cyclesWithData: new Set(measurementData.map((m: any) => m.cycleId.toString())).size,
      };

      // Group by cycle for easier display
      enrichedData.monitoringByCycle = measurementData.reduce((acc: any, data: any) => {
        const cycleId = data.cycleId.toString();
        if (!acc[cycleId]) {
          acc[cycleId] = {
            cycleName: data.cycleName,
            measurements: [],
          };
        }
        acc[cycleId].measurements.push(data);
        return acc;
      }, {});
    }

    // Fetch calculations if requested
    if (shouldIncludeCalculations) {
      const cycles = enrichedData.cycles || await this.cycleRepository.findByPlanId(planId);
      const calculations: any[] = [];

      // Get all metrics from plan
      const metrics: any[] = [];
      if (planData.objectives) {
        for (const objective of planData.objectives) {
          if (objective.questions) {
            for (const question of objective.questions) {
              if (question.metrics) {
                metrics.push(...question.metrics);
              }
            }
          }
        }
      }

      // Calculate metrics for each cycle
      for (const cycle of cycles) {
        for (const metric of metrics) {
          try {
            const result = await this.metricCalculationService.calculateMetricForCycle(
              planId,
              metric._id.toString(),
              cycle._id.toString(),
            );
            calculations.push({
              metricId: metric._id.toString(),
              metricName: metric.metricName,
              metricMnemonic: metric.metricMnemonic,
              cycleId: cycle._id.toString(),
              cycleName: cycle.cycleName || cycle.name,
              calculatedValue: result.calculatedValue,
              formula: metric.metricFormula,
            });
          } catch (error) {
            // Skip if calculation fails (insufficient data)
            continue;
          }
        }
      }

      enrichedData.calculations = calculations;

      // Group by cycle
      enrichedData.calculationsByCycle = calculations.reduce((acc: any, calc: any) => {
        if (!acc[calc.cycleId]) {
          acc[calc.cycleId] = {
            cycleName: calc.cycleName,
            calculations: [],
          };
        }
        acc[calc.cycleId].calculations.push(calc);
        return acc;
      }, {});
    }

    // Add chart images if provided
    if (options?.includeCharts && chartImages) {
      enrichedData.chartImages = chartImages;
    }

    return enrichedData;
  }

  async generateExport(
    planId: string,
    organizationId: string,
    format: ExportFormat,
    options?: ExportOptionsDto,
    locale: string = 'en',
    chartImages?: ChartImageDto[],
  ): Promise<{ filePath: string; filename: string }> {
    // Get the measurement plan data
    let planData = await this.measurementPlanService.findOne(
      planId,
      organizationId,
    );
    if (!planData) {
      throw new NotFoundException(
        `Measurement plan with ID "${planId}" not found`,
      );
    }

    // Enrich plan data with cycles, monitoring, and calculations
    planData = await this.enrichPlanData(planData, planId, options, chartImages);

    const filename = `measurement-plan-${planId}.${format}`;
    const filePath = path.join(process.cwd(), 'exports', filename);

    switch (format) {
      case ExportFormat.PDF:
        await this.generatePDF(planData, filePath, options, locale);
        break;
      case ExportFormat.DOCX:
        await this.generateDOCX(planData, filePath, options, locale);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return { filePath, filename };
  }

  private async generatePDF(
    planData: any,
    filePath: string,
    options?: ExportOptionsDto,
    locale: string = 'en',
  ): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Create HTML template
      const htmlTemplate = this.createHTMLTemplate(planData, options, locale);

      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

      // Generate PDF
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '5mm',
          right: '5mm',
          bottom: '5mm',
          left: '5mm',
        },
      });
    } finally {
      await browser.close();
    }
  }

  private t(key: string, locale: string): string {
    return this.i18n.t(key, { lang: locale });
  }

  private getChartTitle(chartId: string, locale: string): string {
    // Map chart IDs to human-readable translated titles
    const titleMap: Record<string, string> = {
      'metric-calculations-overview': this.t('plans-export.metricCalculationsOverview', locale),
      'measurements-overview': this.t('plans-export.measurementsOverview', locale),
    };

    // For metric-specific charts, extract metric name if available
    // Format: "metric-{MetricName}" -> translate or use metric name
    if (chartId.startsWith('metric-') && !titleMap[chartId]) {
      const metricName = chartId.replace('metric-', '');
      return metricName; // Use the metric name directly (already contains the actual metric name)
    }

    return titleMap[chartId] || chartId;
  }

  private async generateDOCX(
    planData: any,
    filePath: string,
    options?: ExportOptionsDto,
    locale: string = 'en',
  ): Promise<void> {
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Arial',
              size: 24, // 12pt = 24 half-points
              color: '000000',
            },
            paragraph: {
              spacing: {
                line: 360, // 1.5 line spacing (240 * 1.5 = 360)
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: planData.planName.toUpperCase(),
                  bold: true,
                  size: 32, // 16pt
                  font: 'Arial',
                  color: '000000',
                }),
              ],
              alignment: 'center',
              spacing: {
                line: 360,
                after: 400,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${this.t('plans-export.relatedGoal', locale)}: `,
                  bold: true,
                  font: 'Arial',
                  size: 24,
                  color: '000000',
                }),
                new TextRun({
                  text: planData.associatedProjectName || 'N/A',
                  font: 'Arial',
                  size: 24,
                  color: '000000',
                }),
              ],
              spacing: {
                line: 360,
                after: 240,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${this.t('plans-export.planResponsible', locale)}: `,
                  bold: true,
                  font: 'Arial',
                  size: 24,
                  color: '000000',
                }),
                new TextRun({
                  text: planData.planResponsible,
                  font: 'Arial',
                  size: 24,
                  color: '000000',
                }),
              ],
              spacing: {
                line: 360,
                after: 480,
              },
            }),
            new Paragraph({ text: '' }), // Empty line

            // Objectives
            ...this.createObjectivesContent(planData, options, locale),

            // Cycles
            ...this.createCyclesContent(planData, locale),

            // Monitoring Data
            ...this.createMonitoringContent(planData, locale),

            // Calculations
            ...this.createCalculationsContent(planData, locale),

            // Charts
            ...this.createChartsContent(planData, locale),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
  }

  private createHTMLTemplate(
    planData: any,
    options?: ExportOptionsDto,
    locale: string = 'en',
  ): string {
    // Register handlebars helper for index calculations
    handlebars.registerHelper(
      'add',
      function (value: number, addition: number) {
        return value + addition;
      },
    );

    // Register helper for chart titles
    handlebars.registerHelper(
      'chartTitle',
      (chartId: string) => {
        return this.getChartTitle(chartId, locale);
      },
    );

    const template = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{{planName}}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 10mm 15mm 15mm 15mm;
                line-height: 1.5;
                color: #000000;
                font-size: 12pt;
            }
            .header {
                margin-bottom: 30px;
                text-align: left;
            }
            .plan-info {
                font-size: 14pt;
                margin-bottom: 12px;
                color: #000000;
                line-height: 1.5;
            }
            .plan-info strong {
                color: #000000;
                font-weight: bold;
            }

            ul {
                margin: 0;
                padding-left: 20px;
                list-style-type: disc;
            }
            ul ul {
                list-style-type: circle;
                margin-top: 8px;
            }
            ul ul ul {
                list-style-type: square;
            }
            li {
                margin-bottom: 12px;
                line-height: 1.5;
                color: #000000;
                font-size: 12pt;
            }
            .objective-title {
                font-size: 14pt;
                font-weight: bold;
                color: #000000;
                line-height: 1.5;
                margin-bottom: 8px;
            }
            .question-title {
                font-size: 13pt;
                font-weight: bold;
                color: #000000;
                line-height: 1.5;
                margin-bottom: 6px;
            }
            .metric-title {
                font-size: 13pt;
                font-weight: bold;
                color: #000000;
                line-height: 1.5;
                margin-bottom: 6px;
            }

            .info-section-title {
                font-size: 12pt;
                font-weight: bold;
                margin-bottom: 6px;
                color: #000000;
                line-height: 1.5;
            }
            .info-item {
                font-size: 12pt;
                margin-bottom: 4px;
                line-height: 1.5;
                color: #000000;
            }
            .info-item strong {
                color: #000000;
                font-weight: bold;
            }
            .measurement-title {
                font-size: 12pt;
                font-weight: bold;
                margin-bottom: 6px;
                color: #000000;
                line-height: 1.5;
            }
            .measurement-info {
                font-size: 12pt;
                margin-bottom: 4px;
                line-height: 1.5;
                color: #000000;
            }
            .measurement-info strong {
                color: #000000;
                font-weight: bold;
            }

            .objective-container {
                margin-bottom: 40px;
            }

            .section-title {
                font-size: 16pt;
                font-weight: bold;
                color: #000000;
                margin-top: 30px;
                margin-bottom: 15px;
                border-bottom: 2px solid #000000;
                padding-bottom: 5px;
            }

            .subsection-title {
                font-size: 14pt;
                font-weight: bold;
                color: #000000;
                margin-top: 20px;
                margin-bottom: 10px;
            }

            .chart-image {
                max-width: 100%;
                height: auto;
                margin: 20px 0;
                border: 1px solid #cccccc;
                padding: 10px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }

            th, td {
                border: 1px solid #000000;
                padding: 8px;
                text-align: left;
                font-size: 11pt;
            }

            th {
                background-color: #f0f0f0;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="plan-info"><strong>${this.t('plans-export.planName', locale)}</strong> {{planName}}</div>
            <div class="plan-info"><strong>${this.t('plans-export.relatedGoal', locale)}</strong> {{#if associatedProjectName}}{{associatedProjectName}}{{else}}N/A{{/if}}</div>
            <div class="plan-info"><strong>${this.t('plans-export.planResponsible', locale)}</strong> {{planResponsible}}</div>
        </div>

        <ul>
        {{#each objectives}}
            <li class="objective-container">
                <div class="objective-title">${this.t('plans-export.objective', locale)} {{add @index 1}}: {{objectiveTitle}}</div>
                {{#if questions}}
                <ul>
                {{#each questions}}
                    <li>
                        <div class="question-title">${this.t('plans-export.question', locale)} {{add @index 1}}: {{questionText}}</div>
                        {{#if metrics}}
                        <ul>
                        {{#each metrics}}
                            <li>
                                <div class="metric-title">${this.t('plans-export.metric', locale)} {{add @index 1}}: {{metricName}}</div>
                                <ul>
                                    <li>
                                        <div class="info-section-title">${this.t('plans-export.generalInfo', locale)}</div>
                                        <div class="info-item"><strong>${this.t('plans-export.metricDescription', locale)}</strong> {{metricDescription}}</div>
                                        <div class="info-item"><strong>${this.t('plans-export.metricMnemonic', locale)}</strong> {{metricMnemonic}}</div>
                                        <div class="info-item"><strong>${this.t('plans-export.metricFormula', locale)}</strong> {{metricFormula}}</div>
                                    </li>
                                    {{#if ../../../options.includeAnalysis}}
                                    <li>
                                        <div class="info-section-title">${this.t('plans-export.controlAnalysis', locale)}</div>
                                        <div class="info-item"><strong>${this.t('plans-export.metricControlRange', locale)}</strong> [{{metricControlRange.[0]}}, {{metricControlRange.[1]}}]</div>
                                        <div class="info-item"><strong>${this.t('plans-export.analysisProcedure', locale)}</strong> {{analysisProcedure}}</div>
                                        <div class="info-item"><strong>${this.t('plans-export.analysisFrequency', locale)}</strong> {{analysisFrequency}}</div>
                                        {{#if analysisResponsible}}
                                        <div class="info-item"><strong>${this.t('plans-export.analysisResponsible', locale)}</strong> {{analysisResponsible}}</div>
                                        {{/if}}
                                    </li>
                                    {{/if}}
                                    {{#if ../../../options.includeMeasurements}}
                                    <li>
                                        <div class="info-section-title">${this.t('plans-export.measurementDetails', locale)}</div>
                                        {{#each measurements}}
                                        <div class="measurement-title">${this.t('plans-export.measurement', locale)} {{add @index 1}}</div>
                                        <div class="measurement-info"><strong>${this.t('plans-export.measurementProperties', locale)}</strong> {{measurementProperties}}</div>
                                        <div class="measurement-info"><strong>${this.t('plans-export.measurementUnit', locale)}</strong> {{measurementUnit}}</div>
                                        <div class="measurement-info"><strong>${this.t('plans-export.measurementScale', locale)}</strong> {{measurementScale}}</div>
                                        <div class="measurement-info"><strong>${this.t('plans-export.measurementProcedure', locale)}</strong> {{measurementProcedure}}</div>
                                        <div class="measurement-info"><strong>${this.t('plans-export.measurementFrequency', locale)}</strong> {{measurementFrequency}}</div>
                                        {{#if measurementResponsible}}
                                        <div class="measurement-info"><strong>${this.t('plans-export.measurementResponsible', locale)}</strong> {{measurementResponsible}}</div>
                                        {{/if}}
                                        {{/each}}
                                    </li>
                                    {{/if}}
                                </ul>
                            </li>
                        {{/each}}
                        </ul>
                        {{/if}}
                    </li>
                {{/each}}
                </ul>
                {{/if}}
            </li>
        {{/each}}
        </ul>

        {{#if cycles}}
        <div class="section-title">${this.t('plans-export.cycles', locale)}</div>
        <table>
            <thead>
                <tr>
                    <th>${this.t('plans-export.cycleName', locale)}</th>
                    <th>${this.t('plans-export.startDate', locale)}</th>
                    <th>${this.t('plans-export.endDate', locale)}</th>
                    <th>${this.t('plans-export.measurementCount', locale)}</th>
                </tr>
            </thead>
            <tbody>
                {{#each cycles}}
                <tr>
                    <td>{{name}}</td>
                    <td>{{startDate}}</td>
                    <td>{{endDate}}</td>
                    <td>{{measurementCount}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        {{/if}}

        {{#if monitoringData}}
        <div class="section-title">${this.t('plans-export.monitoringData', locale)}</div>
        {{#if monitoringStats}}
        <div class="info-item"><strong>${this.t('plans-export.totalMeasurements', locale)}:</strong> {{monitoringStats.totalMeasurements}}</div>
        <div class="info-item"><strong>${this.t('plans-export.metricsWithData', locale)}:</strong> {{monitoringStats.uniqueMetrics}}</div>
        <div class="info-item"><strong>${this.t('plans-export.cyclesWithData', locale)}:</strong> {{monitoringStats.cyclesWithData}}</div>
        {{/if}}

        {{#each monitoringByCycle}}
        <div class="subsection-title">{{cycleName}}</div>
        <table>
            <thead>
                <tr>
                    <th>${this.t('plans-export.metricName', locale)}</th>
                    <th>${this.t('plans-export.value', locale)}</th>
                    <th>${this.t('plans-export.unit', locale)}</th>
                    <th>${this.t('plans-export.collectedAt', locale)}</th>
                </tr>
            </thead>
            <tbody>
                {{#each measurements}}
                <tr>
                    <td>{{metricName}} ({{metricMnemonic}})</td>
                    <td>{{value}}</td>
                    <td>{{unit}}</td>
                    <td>{{collectedAt}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        {{/each}}
        {{/if}}

        {{#if calculations}}
        <div class="section-title">${this.t('plans-export.metricCalculations', locale)}</div>
        {{#each calculationsByCycle}}
        <div class="subsection-title">{{cycleName}}</div>
        <table>
            <thead>
                <tr>
                    <th>${this.t('plans-export.metricName', locale)}</th>
                    <th>${this.t('plans-export.formula', locale)}</th>
                    <th>${this.t('plans-export.calculatedValue', locale)}</th>
                </tr>
            </thead>
            <tbody>
                {{#each calculations}}
                <tr>
                    <td>{{metricName}} ({{metricMnemonic}})</td>
                    <td>{{formula}}</td>
                    <td>{{calculatedValue}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        {{/each}}
        {{/if}}

        {{#if chartImages}}
        <div class="section-title">${this.t('plans-export.visualizations', locale)}</div>
        {{#each chartImages}}
        <div>
            <div class="subsection-title">{{chartTitle id}}</div>
            <img src="{{data}}" class="chart-image" alt="{{chartTitle id}}" />
        </div>
        {{/each}}
        {{/if}}
    </body>
    </html>
    `;

    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate({
      ...planData,
      createdDate: new Date(planData.createdAt).toLocaleDateString(),
      options: options || {},
    });
  }

  private createStatisticsTable(planData: any): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: `Objectives: ${planData.objectivesCount || 0}`,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Questions: ${planData.questionsCount || 0}`,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Metrics: ${planData.metricsCount || 0}`,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Measurements: ${planData.measurementsCount || 0}`,
          }),
        ],
      }),
      new Paragraph({ text: '' }), // Empty line
    ];
  }

  private createObjectivesContent(
    planData: any,
    options?: ExportOptionsDto,
    locale: string = 'en',
  ): Paragraph[] {
    const content: Paragraph[] = [];

    if (planData.objectives && planData.objectives.length > 0) {
      planData.objectives.forEach((objective: any, objIndex: number) => {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${this.t('plans-export.objective', locale)} ${objIndex + 1}: ${objective.objectiveTitle}`,
                bold: true,
                font: 'Arial',
                size: 28, // 14pt
                color: '000000',
              }),
            ],
            spacing: {
              line: 360,
              before: 240,
              after: 240,
            },
          }),
        );

        if (objective.questions && objective.questions.length > 0) {
          objective.questions.forEach((question: any, qIndex: number) => {
            content.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `- ${this.t('plans-export.question', locale)} ${qIndex + 1}: ${question.questionText}`,
                    size: 26, // 13pt
                    bold: true,
                    font: 'Arial',
                    color: '000000',
                  }),
                ],
                indent: {
                  left: 360,
                },
                spacing: {
                  line: 360,
                  after: 200,
                },
              }),
            );

            if (question.metrics && question.metrics.length > 0) {
              question.metrics.forEach((metric: any, mIndex: number) => {
                content.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `- ${this.t('plans-export.metric', locale)} ${mIndex + 1}: ${metric.metricName}`,
                        size: 26, // 13pt
                        bold: true,
                        font: 'Arial',
                        color: '000000',
                      }),
                    ],
                    indent: {
                      left: 720,
                    },
                    spacing: {
                      line: 360,
                      after: 200,
                    },
                  }),
                );

                // Informações Gerais
                content.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: this.t('plans-export.generalInfo', locale),
                        size: 24,
                        bold: true,
                        font: 'Arial',
                        color: '000000',
                      }),
                    ],
                    indent: {
                      left: 1080,
                    },
                    spacing: {
                      line: 360,
                      before: 200,
                      after: 160,
                    },
                  }),
                );

                content.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${this.t('plans-export.metricDescription', locale)} `,
                        size: 24,
                        bold: true,
                        font: 'Arial',
                        color: '000000',
                      }),
                      new TextRun({
                        text: metric.metricDescription,
                        size: 24,
                        font: 'Arial',
                        color: '000000',
                      }),
                    ],
                    indent: {
                      left: 1440,
                    },
                    spacing: {
                      line: 360,
                      after: 120,
                    },
                  }),
                );

                content.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${this.t('plans-export.metricMnemonic', locale)} `,
                        size: 24,
                        bold: true,
                        font: 'Arial',
                        color: '000000',
                      }),
                      new TextRun({
                        text: metric.metricMnemonic,
                        size: 24,
                        font: 'Arial',
                        color: '000000',
                      }),
                    ],
                    indent: {
                      left: 1440,
                    },
                    spacing: {
                      line: 360,
                      after: 120,
                    },
                  }),
                );

                content.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${this.t('plans-export.metricFormula', locale)} `,
                        size: 24,
                        bold: true,
                        font: 'Arial',
                        color: '000000',
                      }),
                      new TextRun({
                        text: metric.metricFormula,
                        size: 24,
                        font: 'Arial',
                        color: '000000',
                      }),
                    ],
                    indent: {
                      left: 1440,
                    },
                    spacing: {
                      line: 360,
                      after: 200,
                    },
                  }),
                );

                // Controle e Análise
                if (options?.includeAnalysis) {
                  content.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: this.t('plans-export.controlAnalysis', locale),
                          size: 24,
                          bold: true,
                          font: 'Arial',
                          color: '000000',
                        }),
                      ],
                      indent: {
                        left: 1080,
                      },
                      spacing: {
                        line: 360,
                        before: 200,
                        after: 160,
                      },
                    }),
                  );

                  content.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${this.t('plans-export.metricControlRange', locale)} `,
                          size: 24,
                          bold: true,
                          font: 'Arial',
                          color: '000000',
                        }),
                        new TextRun({
                          text: `[${metric.metricControlRange[0]}, ${metric.metricControlRange[1]}]`,
                          size: 24,
                          font: 'Arial',
                          color: '000000',
                        }),
                      ],
                      indent: {
                        left: 1440,
                      },
                      spacing: {
                        line: 360,
                        after: 120,
                      },
                    }),
                  );

                  content.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${this.t('plans-export.analysisProcedure', locale)} `,
                          size: 24,
                          bold: true,
                          font: 'Arial',
                          color: '000000',
                        }),
                        new TextRun({
                          text: metric.analysisProcedure,
                          size: 24,
                          font: 'Arial',
                          color: '000000',
                        }),
                      ],
                      indent: {
                        left: 1440,
                      },
                      spacing: {
                        line: 360,
                        after: 120,
                      },
                    }),
                  );

                  content.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${this.t('plans-export.analysisFrequency', locale)} `,
                          size: 24,
                          bold: true,
                          font: 'Arial',
                          color: '000000',
                        }),
                        new TextRun({
                          text: metric.analysisFrequency,
                          size: 24,
                          font: 'Arial',
                          color: '000000',
                        }),
                      ],
                      indent: {
                        left: 1440,
                      },
                      spacing: {
                        line: 360,
                        after: 120,
                      },
                    }),
                  );

                  if (metric.analysisResponsible) {
                    content.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `${this.t('plans-export.analysisResponsible', locale)} `,
                            size: 24,
                            bold: true,
                            font: 'Arial',
                            color: '000000',
                          }),
                          new TextRun({
                            text: metric.analysisResponsible,
                            size: 24,
                            font: 'Arial',
                            color: '000000',
                          }),
                        ],
                        indent: {
                          left: 1440,
                        },
                        spacing: {
                          line: 360,
                          after: 200,
                        },
                      }),
                    );
                  }
                }

                // Detalhes da Medida
                if (options?.includeMeasurements && metric.measurements) {
                  content.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: this.t('plans-export.measurementDetails', locale),
                          size: 24,
                          bold: true,
                          font: 'Arial',
                          color: '000000',
                        }),
                      ],
                      indent: {
                        left: 1080,
                      },
                      spacing: {
                        line: 360,
                        before: 200,
                        after: 160,
                      },
                    }),
                  );

                  metric.measurements.forEach(
                    (measurement: any, measIndex: number) => {
                      content.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.t('plans-export.measurement', locale)} ${measIndex + 1}`,
                              size: 24,
                              bold: true,
                              font: 'Arial',
                              color: '000000',
                            }),
                          ],
                          indent: {
                            left: 1440,
                          },
                          spacing: {
                            line: 360,
                            before: 160,
                            after: 120,
                          },
                        }),
                      );

                      content.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.t('plans-export.measurementProperties', locale)} `,
                              size: 24,
                              bold: true,
                              font: 'Arial',
                              color: '000000',
                            }),
                            new TextRun({
                              text: measurement.measurementProperties,
                              size: 24,
                              font: 'Arial',
                              color: '000000',
                            }),
                          ],
                          indent: {
                            left: 1800,
                          },
                          spacing: {
                            line: 360,
                            after: 100,
                          },
                        }),
                      );

                      content.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.t('plans-export.measurementUnit', locale)} `,
                              size: 24,
                              bold: true,
                              font: 'Arial',
                              color: '000000',
                            }),
                            new TextRun({
                              text: measurement.measurementUnit,
                              size: 24,
                              font: 'Arial',
                              color: '000000',
                            }),
                          ],
                          indent: {
                            left: 1800,
                          },
                          spacing: {
                            line: 360,
                            after: 100,
                          },
                        }),
                      );

                      content.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.t('plans-export.measurementScale', locale)} `,
                              size: 24,
                              bold: true,
                              font: 'Arial',
                              color: '000000',
                            }),
                            new TextRun({
                              text: measurement.measurementScale,
                              size: 24,
                              font: 'Arial',
                              color: '000000',
                            }),
                          ],
                          indent: {
                            left: 1800,
                          },
                          spacing: {
                            line: 360,
                            after: 100,
                          },
                        }),
                      );

                      content.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.t('plans-export.measurementProcedure', locale)} `,
                              size: 24,
                              bold: true,
                              font: 'Arial',
                              color: '000000',
                            }),
                            new TextRun({
                              text: measurement.measurementProcedure,
                              size: 24,
                              font: 'Arial',
                              color: '000000',
                            }),
                          ],
                          indent: {
                            left: 1800,
                          },
                          spacing: {
                            line: 360,
                            after: 100,
                          },
                        }),
                      );

                      content.push(
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.t('plans-export.measurementFrequency', locale)} `,
                              size: 24,
                              bold: true,
                              font: 'Arial',
                              color: '000000',
                            }),
                            new TextRun({
                              text: measurement.measurementFrequency,
                              size: 24,
                              font: 'Arial',
                              color: '000000',
                            }),
                          ],
                          indent: {
                            left: 1800,
                          },
                          spacing: {
                            line: 360,
                            after: 100,
                          },
                        }),
                      );

                      if (measurement.measurementResponsible) {
                        content.push(
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `${this.t('plans-export.measurementResponsible', locale)} `,
                                size: 24,
                                bold: true,
                                font: 'Arial',
                                color: '000000',
                              }),
                              new TextRun({
                                text: measurement.measurementResponsible,
                                size: 24,
                                font: 'Arial',
                                color: '000000',
                              }),
                            ],
                            indent: {
                              left: 1800,
                            },
                            spacing: {
                              line: 360,
                              after: 200,
                            },
                          }),
                        );
                      }
                    },
                  );
                }

                content.push(
                  new Paragraph({
                    children: [new TextRun({ text: '', font: 'Arial' })],
                    spacing: { line: 360, after: 240 },
                  }),
                ); // Empty line between metrics
              });
            }
          });
        }
      });
    }

    return content;
  }

  private createCyclesContent(planData: any, locale: string): (Paragraph | Table)[] {
    const content: (Paragraph | Table)[] = [];

    if (planData.cycles && planData.cycles.length > 0) {
      // Section title
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: this.t('plans-export.cycles', locale),
              bold: true,
              size: 32, // 16pt
              font: 'Arial',
              color: '000000',
            }),
          ],
          spacing: { before: 480, after: 240, line: 360 },
        }),
      );

      // Create table
      const tableRows = [
        // Header row
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: this.t('plans-export.cycleName', locale),
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: this.t('plans-export.startDate', locale),
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: this.t('plans-export.endDate', locale),
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: this.t('plans-export.measurementCount', locale),
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Data rows
        ...planData.cycles.map(
          (cycle: any) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: cycle.name || '', spacing: { line: 360 } })],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: new Date(cycle.startDate).toLocaleDateString(),
                      spacing: { line: 360 },
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: new Date(cycle.endDate).toLocaleDateString(),
                      spacing: { line: 360 },
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: String(cycle.measurementCount || 0),
                      spacing: { line: 360 },
                    }),
                  ],
                }),
              ],
            }),
        ),
      ];

      content.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );

      content.push(new Paragraph({ text: '', spacing: { after: 240 } }));
    }

    return content;
  }

  private createMonitoringContent(planData: any, locale: string): (Paragraph | Table)[] {
    const content: (Paragraph | Table)[] = [];

    if (planData.monitoringData && planData.monitoringData.length > 0) {
      // Section title
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: this.t('plans-export.monitoringData', locale),
              bold: true,
              size: 32,
              font: 'Arial',
              color: '000000',
            }),
          ],
          spacing: { before: 480, after: 240, line: 360 },
        }),
      );

      // Stats
      if (planData.monitoringStats) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${this.t('plans-export.totalMeasurements', locale)}: ${planData.monitoringStats.totalMeasurements}`,
                size: 24,
              }),
            ],
            spacing: { after: 120, line: 360 },
          }),
        );
      }

      // Group by cycle
      if (planData.monitoringByCycle) {
        Object.values(planData.monitoringByCycle).forEach((cycleData: any) => {
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cycleData.cycleName,
                  bold: true,
                  size: 28,
                }),
              ],
              spacing: { before: 240, after: 160, line: 360 },
            }),
          );

          const tableRows = [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: this.t('plans-export.metricName', locale), bold: true, size: 22 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: this.t('plans-export.value', locale), bold: true, size: 22 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: this.t('plans-export.unit', locale), bold: true, size: 22 })],
                    }),
                  ],
                }),
              ],
            }),
            ...cycleData.measurements.map(
              (m: any) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: `${m.metricName} (${m.metricMnemonic})` })] }),
                    new TableCell({ children: [new Paragraph({ text: String(m.value) })] }),
                    new TableCell({ children: [new Paragraph({ text: m.unit || '' })] }),
                  ],
                }),
            ),
          ];

          content.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          );
          content.push(new Paragraph({ text: '', spacing: { after: 240 } }));
        });
      }
    }

    return content;
  }

  private createCalculationsContent(planData: any, locale: string): (Paragraph | Table)[] {
    const content: (Paragraph | Table)[] = [];

    if (planData.calculations && planData.calculations.length > 0) {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: this.t('plans-export.metricCalculations', locale),
              bold: true,
              size: 32,
              font: 'Arial',
              color: '000000',
            }),
          ],
          spacing: { before: 480, after: 240, line: 360 },
        }),
      );

      if (planData.calculationsByCycle) {
        Object.values(planData.calculationsByCycle).forEach((cycleData: any) => {
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cycleData.cycleName,
                  bold: true,
                  size: 28,
                }),
              ],
              spacing: { before: 240, after: 160, line: 360 },
            }),
          );

          const tableRows = [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: this.t('plans-export.metricName', locale), bold: true, size: 22 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: this.t('plans-export.formula', locale), bold: true, size: 22 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: this.t('plans-export.calculatedValue', locale), bold: true, size: 22 })],
                    }),
                  ],
                }),
              ],
            }),
            ...cycleData.calculations.map(
              (calc: any) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: `${calc.metricName} (${calc.metricMnemonic})` })] }),
                    new TableCell({ children: [new Paragraph({ text: calc.formula || '' })] }),
                    new TableCell({ children: [new Paragraph({ text: String(calc.calculatedValue) })] }),
                  ],
                }),
            ),
          ];

          content.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          );
          content.push(new Paragraph({ text: '', spacing: { after: 240 } }));
        });
      }
    }

    return content;
  }

  private createChartsContent(planData: any, locale: string): Paragraph[] {
    const content: Paragraph[] = [];

    if (planData.chartImages && planData.chartImages.length > 0) {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: this.t('plans-export.visualizations', locale),
              bold: true,
              size: 32,
              font: 'Arial',
              color: '000000',
            }),
          ],
          spacing: { before: 480, after: 240, line: 360 },
        }),
      );

      planData.chartImages.forEach((chart: any) => {
        // Chart title
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: this.getChartTitle(chart.id, locale),
                bold: true,
                size: 28,
              }),
            ],
            spacing: { before: 240, after: 160, line: 360 },
          }),
        );

        // Convert base64 to buffer
        try {
          const base64Data = chart.data.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');

          content.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: 600,
                    height: 300,
                  },
                  type: 'png',
                }),
              ],
              spacing: { after: 240 },
            }),
          );
        } catch (error) {
          console.error('Error adding chart image:', error);
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Error loading chart: ${chart.id}]`,
                  italics: true,
                }),
              ],
              spacing: { after: 240 },
            }),
          );
        }
      });
    }

    return content;
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}
