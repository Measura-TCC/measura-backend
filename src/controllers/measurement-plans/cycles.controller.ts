import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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
import { CycleService } from '@application/measurement-plans/use-cases/cycle.service';
import { MeasurementDataService } from '@application/measurement-plans/use-cases/measurement-data.service';
import { StatusService } from '@application/measurement-plans/use-cases/status.service';
import { MetricCalculationService } from '@application/measurement-plans/use-cases/metric-calculation.service';
import {
  CreateCycleDto,
  UpdateCycleDto,
  CycleResponseDto,
  CycleWithMeasurementsDto,
  CreateMeasurementDataDto,
  UpdateMeasurementDataDto,
  MeasurementDataResponseDto,
  MetricStatusDto,
  PlanStatusDto,
  MetricCalculationResultDto,
  CycleMeasurementsResponseDto,
  FormulaValidationDto,
  ValidateFormulaDto,
} from '@application/measurement-plans/dtos';

interface AuthenticatedRequest {
  user: {
    _id: string;
    email: string;
    organizationId: string | null;
  };
}

@ApiTags('Measurement Cycles')
@Controller('measurement-plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CyclesController {
  constructor(
    private readonly cycleService: CycleService,
    private readonly dataService: MeasurementDataService,
    private readonly statusService: StatusService,
    private readonly calculationService: MetricCalculationService,
  ) {}

  @Post(':organizationId/:planId/cycles')
  @ApiOperation({ summary: 'Create a new measurement cycle' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 201,
    description: 'Cycle created successfully',
    type: CycleResponseDto,
  })
  async createCycle(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Body() createDto: CreateCycleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.cycleService.create(planId, createDto, req.user._id);
  }

  @Get(':organizationId/:planId/cycles')
  @ApiOperation({ summary: 'Get all cycles for a plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Cycles retrieved successfully',
    type: [CycleResponseDto],
  })
  async getAllCycles(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
  ) {
    return this.cycleService.findAll(planId);
  }

  @Put(':organizationId/:planId/cycles/:cycleId')
  @ApiOperation({ summary: 'Update a cycle' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'cycleId', description: 'Cycle ID' })
  @ApiResponse({
    status: 200,
    description: 'Cycle updated successfully',
    type: CycleResponseDto,
  })
  async updateCycle(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('cycleId', ParseMongoIdPipe) cycleId: string,
    @Body() updateDto: UpdateCycleDto,
  ) {
    return this.cycleService.update(planId, cycleId, updateDto);
  }

  @Delete(':organizationId/:planId/cycles/:cycleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cycle' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'cycleId', description: 'Cycle ID' })
  @ApiResponse({ status: 204, description: 'Cycle deleted successfully' })
  async deleteCycle(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('cycleId', ParseMongoIdPipe) cycleId: string,
  ) {
    await this.cycleService.delete(planId, cycleId);
  }

  @Get(':organizationId/:planId/cycles/:cycleId/measurements')
  @ApiOperation({ summary: 'Get a cycle with its measurements' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'cycleId', description: 'Cycle ID' })
  @ApiResponse({
    status: 200,
    description: 'Cycle with measurements retrieved successfully',
    type: CycleWithMeasurementsDto,
  })
  async getCycleWithMeasurements(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('cycleId', ParseMongoIdPipe) cycleId: string,
  ) {
    return this.cycleService.getCycleWithMeasurements(planId, cycleId);
  }

  @Get(':organizationId/:planId/cycles-with-measurements')
  @ApiOperation({ summary: 'Get all cycles with their measurements' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'All cycles with measurements retrieved successfully',
    type: [CycleWithMeasurementsDto],
  })
  async getAllCyclesWithMeasurements(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
  ) {
    return this.cycleService.getAllCyclesWithMeasurements(planId);
  }

  @Post(
    ':organizationId/:planId/objectives/:objectiveId/questions/:questionId/metrics/:metricId/measurement-data',
  )
  @ApiOperation({ summary: 'Add measurement data (actual values) to a metric' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({
    status: 201,
    description: 'Measurement data created successfully',
    type: MeasurementDataResponseDto,
  })
  async createMeasurementData(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
    @Body() createDto: CreateMeasurementDataDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.dataService.create(
      planId,
      objectiveId,
      questionId,
      metricId,
      createDto,
      req.user._id,
    );
  }

  @Put(':organizationId/:planId/measurement-data/:measurementDataId')
  @ApiOperation({ summary: 'Update measurement data' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'measurementDataId', description: 'Measurement Data ID' })
  @ApiResponse({
    status: 200,
    description: 'Measurement data updated successfully',
    type: MeasurementDataResponseDto,
  })
  async updateMeasurementData(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('measurementDataId', ParseMongoIdPipe) measurementDataId: string,
    @Body() updateDto: UpdateMeasurementDataDto,
  ) {
    return this.dataService.update(planId, measurementDataId, updateDto);
  }

  @Delete(':organizationId/:planId/measurement-data/:measurementDataId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete measurement data' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'measurementDataId', description: 'Measurement Data ID' })
  @ApiResponse({
    status: 204,
    description: 'Measurement data deleted successfully',
  })
  async deleteMeasurementData(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('measurementDataId', ParseMongoIdPipe) measurementDataId: string,
  ) {
    await this.dataService.delete(planId, measurementDataId);
  }

  @Get(':organizationId/:planId/metrics/:metricId/status')
  @ApiOperation({ summary: 'Get status for a specific metric' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({
    status: 200,
    description: 'Metric status retrieved successfully',
    type: MetricStatusDto,
  })
  async getMetricStatus(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
  ) {
    return this.statusService.getMetricStatus(planId, metricId);
  }

  @Get(':organizationId/:planId/status')
  @ApiOperation({ summary: 'Get overall status for a plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan status retrieved successfully',
    type: PlanStatusDto,
  })
  async getPlanStatus(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
  ) {
    return this.statusService.getPlanStatus(planId);
  }

  @Get(
    ':organizationId/:planId/cycles/:cycleId/metrics/:metricId/measurements-with-acronyms',
  )
  @ApiOperation({
    summary: 'Get measurements with acronyms for a metric in a cycle',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'cycleId', description: 'Cycle ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({
    status: 200,
    description: 'Measurements with acronyms retrieved successfully',
    type: CycleMeasurementsResponseDto,
  })
  async getMeasurementsWithAcronyms(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('cycleId', ParseMongoIdPipe) cycleId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
  ) {
    return this.calculationService.getMeasurementsWithAcronyms(
      planId,
      cycleId,
      metricId,
    );
  }

  @Post(':organizationId/:planId/cycles/:cycleId/metrics/:metricId/calculate')
  @ApiOperation({ summary: 'Calculate metric value for a cycle' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'cycleId', description: 'Cycle ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({
    status: 200,
    description: 'Metric calculated successfully',
    type: MetricCalculationResultDto,
  })
  async calculateMetric(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('cycleId', ParseMongoIdPipe) cycleId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
  ) {
    return this.calculationService.calculateMetricForCycle(
      planId,
      metricId,
      cycleId,
    );
  }

  @Post(':organizationId/:planId/metrics/validate-formula')
  @ApiOperation({ summary: 'Validate a metric formula' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Formula validation result',
    type: FormulaValidationDto,
  })
  async validateFormula(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Body() dto: ValidateFormulaDto,
  ) {
    return this.calculationService.validateFormula(dto.formula);
  }
}
