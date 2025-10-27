import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/utils/guards/jwt-auth.guard';
import { ParseMongoIdPipe } from '@shared/utils/pipes/parse-mongo-id.pipe';
import { MeasurementPlanService } from '@application/measurement-plans/use-cases/measurement-plan.service';
import {
  CreateMeasurementPlanDto,
  UpdateMeasurementPlanDto,
  MeasurementPlanSummaryDto,
  MeasurementPlanResponseDto,
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  CreateMetricDto,
  UpdateMetricDto,
  CreateMeasurementDto,
  UpdateMeasurementDto,
} from '@application/measurement-plans/dtos';

interface AuthenticatedRequest {
  user: {
    _id: string;
    email: string;
    organizationId: string | null;
  };
}

@ApiTags('Measurement Plans')
@Controller('measurement-plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeasurementPlansController {
  constructor(
    private readonly measurementPlanService: MeasurementPlanService,
  ) {}

  private validateOrganizationAccess(
    userOrgId: string | null,
    requestedOrgId: string,
  ): void {
    // TEMPORARILY DISABLED: Organization validation bypassed for development
    // if (!userOrgId) {
    //   throw new ForbiddenException(
    //     'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
    //   );
    // }
    // if (userOrgId !== requestedOrgId) {
    //   throw new ForbiddenException('Access denied to this organization');
    // }
  }

  // Plan Management
  @Post(':organizationId')
  @ApiOperation({ summary: 'Create a new measurement plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Plan created successfully',
    type: MeasurementPlanResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict with existing data' })
  async create(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Body() createDto: CreateMeasurementPlanDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.measurementPlanService.create(
      createDto,
      req.user._id,
      organizationId,
    );
  }

  @Get(':organizationId')
  @ApiOperation({
    summary: 'Get measurement plans with pagination and filtering',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in plan names',
  })
  @ApiResponse({
    status: 200,
    description: 'Plans retrieved successfully',
    type: [MeasurementPlanSummaryDto],
  })
  async findAll(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Request() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.measurementPlanService.findAll(organizationId, page, limit, {
      status,
      projectId,
      search,
    });
  }

  @Get(':organizationId/:planId')
  @ApiOperation({ summary: 'Get a measurement plan by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan retrieved successfully',
    type: MeasurementPlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findOne(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.measurementPlanService.findOne(planId, organizationId);
  }

  @Put(':organizationId/:planId')
  @ApiOperation({ summary: 'Update a measurement plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan updated successfully',
    type: MeasurementPlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Body() updateDto: UpdateMeasurementPlanDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.measurementPlanService.update(
      planId,
      updateDto,
      organizationId,
    );
  }

  @Delete(':organizationId/:planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a measurement plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 204, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete active or completed plan',
  })
  async remove(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    await this.measurementPlanService.remove(planId, organizationId);
  }

  // Objectives Management
  @Post(':organizationId/:planId/objectives')
  @ApiOperation({ summary: 'Add objective to measurement plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 201, description: 'Objective added successfully' })
  async addObjective(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Body() createDto: CreateObjectiveDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.measurementPlanService.addObjective(
      planId,
      createDto,
      organizationId,
    );
  }

  @Put(':organizationId/:planId/objectives/:objectiveId')
  @ApiOperation({ summary: 'Update objective in measurement plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiResponse({ status: 200, description: 'Objective updated successfully' })
  async updateObjective(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Body() updateDto: UpdateObjectiveDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.measurementPlanService.updateObjective(
      planId,
      objectiveId,
      updateDto,
      organizationId,
    );
  }

  @Delete(':organizationId/:planId/objectives/:objectiveId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete objective from measurement plan' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiResponse({ status: 204, description: 'Objective deleted successfully' })
  async deleteObjective(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    await this.measurementPlanService.deleteObjective(
      planId,
      objectiveId,
      organizationId,
    );
  }

  // Questions Management
  @Post(':organizationId/:planId/objectives/:objectiveId/questions')
  @ApiOperation({ summary: 'Add question to objective' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiResponse({ status: 201, description: 'Question added successfully' })
  async addQuestion(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Body() createDto: CreateQuestionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.measurementPlanService.addQuestion(
      planId,
      objectiveId,
      createDto,
      organizationId,
    );
  }

  @Put(':id/objectives/:objectiveId/questions/:questionId')
  @ApiOperation({ summary: 'Update question in objective' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestion(
    @Param('id', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Body() updateDto: UpdateQuestionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    return this.measurementPlanService.updateQuestion(
      planId,
      objectiveId,
      questionId,
      updateDto,
      req.user.organizationId,
    );
  }

  @Delete(':id/objectives/:objectiveId/questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete question from objective' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  async deleteQuestion(
    @Param('id', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    await this.measurementPlanService.deleteQuestion(
      planId,
      objectiveId,
      questionId,
      req.user.organizationId,
    );
  }

  // Metrics Management
  @Post(':organizationId/:planId/objectives/:objectiveId/questions/:questionId/metrics')
  @ApiOperation({
    summary: 'Add metric to question (with at least one measurement required)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 201, description: 'Metric added successfully' })
  async addMetric(
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Body() createDto: CreateMetricDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    return this.measurementPlanService.addMetric(
      planId,
      objectiveId,
      questionId,
      createDto,
      req.user.organizationId,
    );
  }

  @Put(':organizationId/:planId/objectives/:objectiveId/questions/:questionId/metrics/:metricId')
  @ApiOperation({ summary: 'Update metric and its measurements' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({ status: 200, description: 'Metric updated successfully' })
  async updateMetric(
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
    @Body() updateDto: UpdateMetricDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    return this.measurementPlanService.updateMetric(
      planId,
      objectiveId,
      questionId,
      metricId,
      updateDto,
      req.user.organizationId,
    );
  }

  @Delete(':organizationId/:planId/objectives/:objectiveId/questions/:questionId/metrics/:metricId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete metric from question' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({ status: 204, description: 'Metric deleted successfully' })
  async deleteMetric(
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    await this.measurementPlanService.deleteMetric(
      planId,
      objectiveId,
      questionId,
      metricId,
      req.user.organizationId,
    );
  }

  // Measurements Management
  @Post(
    ':organizationId/:planId/objectives/:objectiveId/questions/:questionId/metrics/:metricId/measurement-definitions',
  )
  @ApiOperation({ summary: 'Add measurement definition (schema/template) to metric' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({ status: 201, description: 'Measurement added successfully' })
  async addMeasurement(
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
    @Body() createDto: CreateMeasurementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    return this.measurementPlanService.addMeasurement(
      planId,
      objectiveId,
      questionId,
      metricId,
      createDto,
      req.user.organizationId,
    );
  }

  @Put(
    ':organizationId/:planId/objectives/:objectiveId/questions/:questionId/metrics/:metricId/measurement-definitions/:measurementId',
  )
  @ApiOperation({ summary: 'Update specific measurement definition' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiParam({ name: 'measurementId', description: 'Measurement ID' })
  @ApiResponse({ status: 200, description: 'Measurement updated successfully' })
  async updateMeasurement(
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
    @Param('measurementId', ParseMongoIdPipe) measurementId: string,
    @Body() updateDto: UpdateMeasurementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    return this.measurementPlanService.updateMeasurement(
      planId,
      objectiveId,
      questionId,
      metricId,
      measurementId,
      updateDto,
      req.user.organizationId,
    );
  }

  @Delete(
    ':organizationId/:planId/objectives/:objectiveId/questions/:questionId/metrics/:metricId/measurement-definitions/:measurementId',
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete specific measurement definition' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiParam({ name: 'measurementId', description: 'Measurement ID' })
  @ApiResponse({ status: 204, description: 'Measurement deleted successfully' })
  async deleteMeasurement(
    @Param('planId', ParseMongoIdPipe) planId: string,
    @Param('objectiveId', ParseMongoIdPipe) objectiveId: string,
    @Param('questionId', ParseMongoIdPipe) questionId: string,
    @Param('metricId', ParseMongoIdPipe) metricId: string,
    @Param('measurementId', ParseMongoIdPipe) measurementId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException(
        'You must be assigned to an organization to access measurement plans. Please contact your administrator to be added to an organization.',
      );
    }

    await this.measurementPlanService.deleteMeasurement(
      planId,
      objectiveId,
      questionId,
      metricId,
      measurementId,
      req.user.organizationId,
    );
  }
}
