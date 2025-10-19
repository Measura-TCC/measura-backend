import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/utils/guards/jwt-auth.guard';
import { RequirementService } from '@application/fpa/use-cases/requirement.service';
import { EstimateService } from '@application/fpa/use-cases/estimate.service';
import { CreateRequirementDto } from '@application/fpa/dtos/requirement/create-requirement.dto';
import { UpdateRequirementDto } from '@application/fpa/dtos/requirement/update-requirement.dto';
import { RequirementDto } from '@application/fpa/dtos/requirement/requirement.dto';
import { Requirement } from '@domain/fpa/entities/requirement.entity';

interface AuthenticatedRequest {
  user: {
    _id: string;
    email: string;
    organizationId: string | null;
  };
}

@ApiTags('Requirements')
@Controller('estimates/:estimateId/requirements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RequirementsController {
  constructor(
    private readonly requirementService: RequirementService,
    private readonly estimateService: EstimateService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all requirements for an estimate',
    description:
      'Returns all requirements associated with the estimate, including their FPA component links for traceability',
  })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all requirements for the estimate',
    type: [RequirementDto],
  })
  @ApiResponse({ status: 404, description: 'Estimate not found' })
  async findAll(
    @Param('estimateId') estimateId: string,
  ): Promise<Requirement[]> {
    try {
      // Verify estimate exists
      await this.estimateService.findOne(estimateId, ''); // TODO: Add org validation
      return await this.requirementService.getByEstimate(estimateId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch requirements: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post()
  @ApiOperation({
    summary: 'Add a requirement to an estimate',
    description:
      'Add a new requirement to an existing estimate. The requirement can be classified later.',
  })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiResponse({
    status: 201,
    description: 'Requirement added successfully',
    type: RequirementDto,
  })
  @ApiResponse({ status: 404, description: 'Estimate not found' })
  @ApiBody({ type: CreateRequirementDto })
  async create(
    @Param('estimateId') estimateId: string,
    @Body() createDto: CreateRequirementDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Requirement> {
    try {
      // Verify estimate exists and get its organization/project
      const estimate = await this.estimateService.findOne(estimateId, '');

      return await this.requirementService.addRequirement(
        estimateId,
        createDto,
        estimate.organizationId.toString(),
        estimate.projectId.toString(),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to add requirement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a requirement',
    description: 'Update requirement details such as title, description, or source information',
  })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiParam({ name: 'id', description: 'The requirement ID' })
  @ApiResponse({
    status: 200,
    description: 'Requirement updated successfully',
    type: RequirementDto,
  })
  @ApiResponse({ status: 404, description: 'Requirement not found' })
  @ApiBody({ type: UpdateRequirementDto })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRequirementDto,
  ): Promise<Requirement> {
    try {
      return await this.requirementService.updateRequirement(id, updateDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update requirement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a requirement and its FPA component',
    description:
      'Deletes the requirement and its associated FPA component (ALI, EI, EO, EQ, or AIE) if one exists',
  })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiParam({ name: 'id', description: 'The requirement ID' })
  @ApiResponse({
    status: 200,
    description: 'Requirement deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Requirement not found' })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    try {
      const result = await this.requirementService.deleteRequirement(id);
      return { success: result };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete requirement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
