import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ReportGeneratorService } from '@domain/fpa/services/report-generator.service';
import {
  ESTIMATE_REPOSITORY,
  IEstimateRepository,
} from '@domain/fpa/interfaces/estimate.repository.interface';
import { Inject } from '@nestjs/common';
import { GenerateComparisonReportDto } from '@application/fpa/dtos/report.dto';
import { Estimate } from '@domain/fpa/entities/estimate.entity';
import {
  DetailedReport,
  DetailedReportSection,
  SummaryReport,
  ComparisonReport,
} from '@domain/fpa/services/report-generator.service';
import * as puppeteer from 'puppeteer';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

@ApiTags('estimate-reports')
@Controller('estimates/reports')
export class ReportsController {
  constructor(
    @Inject(ESTIMATE_REPOSITORY)
    private readonly estimateRepository: IEstimateRepository,
    private readonly reportGeneratorService: ReportGeneratorService,
    private readonly i18n: I18nService,
  ) {}

  private t(key: string, locale: string): string {
    return this.i18n.t(key, { lang: locale });
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Generate a detailed report for an estimate' })
  @ApiParam({ name: 'id', description: 'The estimate ID' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Report format (json, html, or pdf)',
  })
  @ApiQuery({ name: 'locale', required: false, description: 'Language code (en or pt)' })
  @ApiResponse({
    status: 200,
    description: 'Detailed report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Estimate not found' })
  async generateDetailedReport(
    @Param('id') id: string,
    @Query('format') format: string = 'json',
    @Query('locale') locale: string = 'en',
    @Res() res: Response,
  ) {
    try {
      const estimate = await this.estimateRepository.findById(id);

      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${id} not found`);
      }

      const report =
        this.reportGeneratorService.generateDetailedReport(estimate, locale);

      if (format === 'html') {
        // Simple HTML formatting for demonstration (in a real app, you'd use a template engine)
        const html = this.convertToHtml(report, locale);
        return res
          .status(HttpStatus.OK)
          .header('Content-Type', 'text/html')
          .send(html);
      } else if (format === 'pdf') {
        // Generate PDF using puppeteer
        const html = this.convertToHtml(report, locale);
        const pdf = await this.generatePdf(html, `Detailed_Report_${id}`);
        return res
          .status(HttpStatus.OK)
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `attachment; filename="Detailed_Report_${id}.pdf"`,
          )
          .send(pdf);
      }

      return res.status(HttpStatus.OK).json(report);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Generate a summary report for an estimate' })
  @ApiParam({ name: 'id', description: 'The estimate ID' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Report format (json, html, or pdf)',
  })
  @ApiQuery({ name: 'locale', required: false, description: 'Language code (en or pt)' })
  @ApiResponse({
    status: 200,
    description: 'Summary report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Estimate not found' })
  async generateSummaryReport(
    @Param('id') id: string,
    @Query('format') format: string = 'json',
    @Query('locale') locale: string = 'en',
    @Res() res: Response,
  ) {
    try {
      const estimate = await this.estimateRepository.findById(id);

      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${id} not found`);
      }

      const report =
        this.reportGeneratorService.generateSummaryReport(estimate, locale);

      if (format === 'html') {
        // Create HTML version of the summary report
        const html = this.convertSummaryToHtml(report, locale);
        return res
          .status(HttpStatus.OK)
          .header('Content-Type', 'text/html')
          .send(html);
      } else if (format === 'pdf') {
        // Generate PDF using puppeteer
        const html = this.convertSummaryToHtml(report, locale);
        const pdf = await this.generatePdf(html, `Summary_Report_${id}`);
        return res
          .status(HttpStatus.OK)
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `attachment; filename="Summary_Report_${id}.pdf"`,
          )
          .send(pdf);
      }

      return res.status(HttpStatus.OK).json(report);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post('comparison')
  @ApiOperation({
    summary: 'Generate a comparison report for multiple estimates',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Report format (json, html, or pdf)',
  })
  @ApiQuery({ name: 'locale', required: false, description: 'Language code (en or pt)' })
  @ApiResponse({
    status: 200,
    description: 'Comparison report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'One or more estimates not found' })
  async generateComparisonReport(
    @Body() dto: GenerateComparisonReportDto,
    @Query('format') format: string = 'json',
    @Query('locale') locale: string = 'en',
    @Res() res: Response,
  ) {
    try {
      const estimates: Estimate[] = [];

      for (const id of dto.estimateIds) {
        const estimate = await this.estimateRepository.findById(id);
        if (!estimate) {
          throw new NotFoundException(`Estimate with ID ${id} not found`);
        }
        estimates.push(estimate);
      }

      if (estimates.length < 2) {
        throw new InternalServerErrorException(
          'At least two estimates are required for comparison',
        );
      }

      const report =
        this.reportGeneratorService.generateComparisonReport(estimates, locale);

      if (format === 'html') {
        // Create HTML version of the comparison report
        const html = this.convertComparisonToHtml(report, locale);
        return res
          .status(HttpStatus.OK)
          .header('Content-Type', 'text/html')
          .send(html);
      } else if (format === 'pdf') {
        // Generate PDF using puppeteer
        const html = this.convertComparisonToHtml(report, locale);
        const pdf = await this.generatePdf(html, `Comparison_Report`);
        return res
          .status(HttpStatus.OK)
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `attachment; filename="Comparison_Report.pdf"`,
          )
          .send(pdf);
      }

      return res.status(HttpStatus.OK).json(report);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to generate comparison: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export an estimate in various formats' })
  @ApiParam({ name: 'id', description: 'The estimate ID' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format (json, csv, or pdf)',
  })
  @ApiQuery({ name: 'locale', required: false, description: 'Language code (en or pt)' })
  @ApiResponse({ status: 200, description: 'Export generated successfully' })
  @ApiResponse({ status: 404, description: 'Estimate not found' })
  async exportEstimate(
    @Param('id') id: string,
    @Query('format') format: string = 'json',
    @Query('locale') locale: string = 'en',
    @Res() res: Response,
  ) {
    try {
      const estimate = await this.estimateRepository.findById(id);

      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${id} not found`);
      }

      let result: string | Buffer;
      let contentType: 'text/csv' | 'application/pdf' | 'application/json';
      let filename: string;

      if (format === 'csv') {
        result = this.reportGeneratorService.generateCSVExport([estimate]);
        contentType = 'text/csv';
        filename = `estimate_${id}_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (format === 'pdf') {
        const report =
          this.reportGeneratorService.generateDetailedReport(estimate, locale);
        const html = this.convertToHtml(report, locale);
        result = await this.generatePdf(html, `Estimate_${id}`);
        contentType = 'application/pdf';
        filename = `estimate_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
      } else {
        result = this.reportGeneratorService.generateJSONExport(estimate);
        contentType = 'application/json';
        filename = `estimate_${id}_${new Date().toISOString().split('T')[0]}.json`;
      }

      return res
        .status(HttpStatus.OK)
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(result);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to export: ${errorMessage}`,
      );
    }
  }

  private convertToHtml(report: DetailedReport, locale: string): string {
    // A very basic HTML generator for demonstration purposes
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          h2 { color: #555; margin-top: 20px; }
          .section { margin-bottom: 20px; }
          .date { color: #888; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p class="date">${this.t('fpa-export.date', locale)}: ${report.date}</p>
        <p>${report.summary}</p>
    `;

    report.sections.forEach((section: DetailedReportSection) => {
      const safeTitle = escapeHtml(section.title);
      html += `<div class="section">
        <h2>${safeTitle}</h2>`;

      const content = section.content;
      if (isStringArray(content)) {
        html += '<ul>';
        content.forEach((item) => {
          html += `<li>${escapeHtml(item)}</li>`;
        });
        html += '</ul>';
      } else if (typeof content === 'string') {
        html += `<p>${escapeHtml(content)}</p>`;
      } else {
        html += '<p>Invalid content format</p>';
      }

      html += '</div>';
    });

    html += `
      </body>
      </html>
    `;

    return html;
  }

  private convertSummaryToHtml(report: SummaryReport, locale: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .date { color: #888; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p class="date">Date: ${report.date}</p>

        <table>
          <tr>
            <th>${this.t('fpa-export.metric', locale)}</th>
            <th>${this.t('fpa-export.value', locale)}</th>
          </tr>
          <tr>
            <td>${this.t('fpa-export.totalFunctionPointsUnadjusted', locale)}</td>
            <td>${report.totalFunctionPoints}</td>
          </tr>
          <tr>
            <td>${this.t('fpa-export.adjustedFunctionPoints', locale)}</td>
            <td>${report.adjustedFunctionPoints}</td>
          </tr>
          <tr>
            <td>${this.t('fpa-export.estimatedEffortHours', locale)}</td>
            <td>${report.estimatedEffort}</td>
          </tr>
          <tr>
            <td>${this.t('fpa-export.recommendedTeamSize', locale)}</td>
            <td>${report.teamSize}</td>
          </tr>
          <tr>
            <td>${this.t('fpa-export.estimatedDurationMonths', locale)}</td>
            <td>${report.duration}</td>
          </tr>
          <tr>
            <td>${this.t('fpa-export.gscScore', locale)}</td>
            <td>${report.gscScore}</td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private convertComparisonToHtml(report: ComparisonReport, locale: string): string {
    let estimatesHtml = '';
    report.estimates.forEach((est, index: number) => {
      estimatesHtml += `
        <tr>
          <td>${est.name}</td>
          <td>${est.version}</td>
          <td>${est.date}</td>
          <td>${est.functionPoints}</td>
          <td>${est.effort}</td>
          ${index > 0 ? `<td>${report.percentageDifferences[index - 1].functionPoints}%</td>` : '<td>-</td>'}
          ${index > 0 ? `<td>${report.percentageDifferences[index - 1].effort}%</td>` : '<td>-</td>'}
        </tr>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          h2 { color: #555; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .trend { font-weight: bold; }
          .date { color: #888; }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p class="date">Date: ${report.date}</p>

        <h2>${this.t('fpa-export.comparisonData', locale)}</h2>
        <table>
          <tr>
            <th>${this.t('fpa-export.name', locale)}</th>
            <th>${this.t('fpa-export.version', locale)}</th>
            <th>${this.t('fpa-export.date', locale)}</th>
            <th>${this.t('fpa-export.functionPoints', locale)}</th>
            <th>${this.t('fpa-export.effortHours', locale)}</th>
            <th>${this.t('fpa-export.fpPercentChange', locale)}</th>
            <th>${this.t('fpa-export.effortPercentChange', locale)}</th>
          </tr>
          ${estimatesHtml}
        </table>

        <h2>${this.t('fpa-export.trendAnalysis', locale)}</h2>
        <p class="trend">${this.t('fpa-export.overallTrend', locale)}: ${report.trendAnalysis.trend}</p>
        <p>${this.t('fpa-export.percentageChange', locale)}: ${report.trendAnalysis.percentageChange}%</p>
      </body>
      </html>
    `;
  }

  private async generatePdf(html: string, title: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">${title}</div>`,
      footerTemplate:
        '<div style="font-size: 10px; text-align: center; width: 100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}
