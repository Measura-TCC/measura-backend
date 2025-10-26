import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { RolesGuard } from '@shared/utils/guards/roles.guard';
import { Roles } from '@shared/utils/decorators/roles.decorator';
import { UserRole } from '@domain/users/entities/user.entity';
import { ProjectService } from '@application/projects/use-cases/project.service';
import { CreateProjectDto, UpdateProjectDto } from '@application/projects/dtos';
import { ParseMongoIdPipe } from '@shared/utils/pipes/parse-mongo-id.pipe';

interface AuthenticatedRequest {
  user: {
    _id: string;
    email: string;
    organizationId: string | null;
    role: UserRole;
  };
}

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  private validateOrganizationAccess(
    userOrgId: string | null,
    requestedOrgId: string,
  ): void {
    // TEMPORARILY DISABLED: Organization validation bypassed for development
    // if (!userOrgId) {
    //   throw new ForbiddenException(
    //     'You must be assigned to an organization to access projects. Please contact your administrator to be added to an organization.',
    //   );
    // }
    // if (userOrgId !== requestedOrgId) {
    //   throw new ForbiddenException('Access denied to this organization');
    // }
  }

  @Post(':organizationId')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'The project has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Access denied to organization' })
  async create(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    // Ensure the project is created for the correct organization
    const projectData = {
      ...createProjectDto,
      organizationId,
    };

    return this.projectService.create(projectData, req.user._id);
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Get projects by organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Return organization projects.',
  })
  @ApiResponse({ status: 403, description: 'Access denied to organization' })
  async findAll(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    return this.projectService.findByOrganization(organizationId);
  }

  @Get(':organizationId/:id')
  @ApiOperation({ summary: 'Get a project by id with related plans and estimates' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({
    name: 'id',
    description: 'The id of the project',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the project with the specified id, including measurement plans and estimates.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 403, description: 'Access denied to organization' })
  async findOne(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    const projectWithRelations = await this.projectService.findOneWithRelations(id);

    // Ensure project belongs to the requested organization
    if (projectWithRelations.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return projectWithRelations;
  }

  @Put(':organizationId/:id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({
    name: 'id',
    description: 'The id of the project',
  })
  @ApiResponse({
    status: 200,
    description: 'The project has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 403, description: 'Access denied to organization' })
  async update(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    const existingProject = await this.projectService.findOne(id);

    // Ensure project belongs to the requested organization
    if (existingProject.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':organizationId/:id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({
    name: 'id',
    description: 'The id of the project',
  })
  @ApiResponse({
    status: 200,
    description: 'The project has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 403, description: 'Access denied to organization' })
  async remove(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    const existingProject = await this.projectService.findOne(id);

    // Ensure project belongs to the requested organization
    if (existingProject.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return this.projectService.remove(id);
  }

  @Get(':organizationId/:id/versions')
  @ApiOperation({ summary: 'Get all versions of a project' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({
    name: 'id',
    description: 'The id of the project',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all versions of the project.',
  })
  @ApiResponse({ status: 403, description: 'Access denied to organization' })
  async getVersions(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    const existingProject = await this.projectService.findOne(id);

    // Ensure project belongs to the requested organization
    if (existingProject.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return this.projectService.getVersions(id);
  }

  @Post(':organizationId/:id/versions')
  @ApiOperation({ summary: 'Create a new version of a project' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({
    name: 'id',
    description: 'The id of the project',
  })
  @ApiResponse({
    status: 201,
    description: 'The project version has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Access denied to organization' })
  async createVersion(
    @Param('organizationId', ParseMongoIdPipe) organizationId: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    this.validateOrganizationAccess(req.user.organizationId, organizationId);

    const existingProject = await this.projectService.findOne(id);

    // Ensure project belongs to the requested organization
    if (existingProject.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this project');
    }

    return this.projectService.createVersion(id);
  }
}
