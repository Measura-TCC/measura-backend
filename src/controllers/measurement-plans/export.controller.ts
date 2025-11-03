import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/utils/guards/jwt-auth.guard';
import { ParseMongoIdPipe } from '@shared/utils/pipes/parse-mongo-id.pipe';
import { MeasurementPlanService } from '@application/measurement-plans/use-cases/measurement-plan.service';
import { ExportService } from '@application/measurement-plans/use-cases/export.service';
import {
  ExportMeasurementPlanDto,
  ExportResponseDto,
} from '@application/measurement-plans/dtos';

interface AuthenticatedRequest {
  user: {
    _id: string;
    email: string;
    organizationId: string | null;
  };
}

@ApiTags('Measurement Plans Export')
@Controller('measurement-plans')
export class MeasurementPlansExportController {
  constructor(
    private readonly measurementPlanService: MeasurementPlanService,
    private readonly exportService: ExportService,
  ) {}

  @Post(':organizationId/:planId/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export measurement plan as PDF or DOCX' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Export generated successfully',
    type: ExportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 400, description: 'Invalid export options' })
  async exportPlan(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Body() exportDto: ExportMeasurementPlanDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // TEMPORARILY DISABLED: Organization validation bypassed for development
    // if (!req.user.organizationId) {
    //   throw new ForbiddenException(
    //     'You must be assigned to an organization to export measurement plans. Please contact your administrator to be added to an organization.',
    //   );
    // }
    // if (req.user.organizationId !== organizationId) {
    //   throw new ForbiddenException('Access denied to this organization');
    // }

    // Generate the actual export file
    const { filePath, filename } = await this.exportService.generateExport(
      planId,
      organizationId,
      exportDto.format,
      exportDto.options,
      exportDto.locale,
    );

    const downloadUrl = `/files/exports/${filename}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Schedule file cleanup after expiration
    setTimeout(
      async () => {
        await this.exportService.cleanupFile(filePath);
      },
      24 * 60 * 60 * 1000,
    );

    const response: ExportResponseDto = {
      downloadUrl,
      filename,
      expiresAt: expiresAt.toISOString(),
    };

    return response;
  }
}
