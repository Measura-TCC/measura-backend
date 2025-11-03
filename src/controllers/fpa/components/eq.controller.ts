import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/utils/guards/jwt-auth.guard';
import { EQ } from '@domain/fpa/entities/eq.entity';
import { ComplexityLevel } from '@domain/fpa/entities/base-fpa-component.entity';
import {
  EQ_REPOSITORY,
  IEQRepository,
} from '@domain/fpa/interfaces/eq.repository.interface';
import {
  ESTIMATE_REPOSITORY,
  IEstimateRepository,
} from '@domain/fpa/interfaces/estimate.repository.interface';
import { CreateEQDto } from '@application/fpa/dtos/create-eq.dto';
import { UpdateEQDto } from '@application/fpa/dtos/components/update-eq.dto';
import { ComplexityCalculator } from '@domain/fpa/services/complexity-calculator.service';

@ApiTags('estimate-components')
@Controller('estimates/:estimateId/components/eq')
@UseGuards(JwtAuthGuard)
export class EQController {
  constructor(
    @Inject(EQ_REPOSITORY)
    private readonly eqRepository: IEQRepository,
    @Inject(ESTIMATE_REPOSITORY)
    private readonly estimateRepository: IEstimateRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new External Query (EQ) component' })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiResponse({
    status: 201,
    description: 'EQ component created successfully',
  })
  @ApiResponse({ status: 404, description: 'Estimate not found' })
  @ApiBody({
    type: CreateEQDto,
    description: 'EQ component data',
  })
  async create(
    @Param('estimateId') estimateId: string,
    @Body() eqData: CreateEQDto,
  ): Promise<EQ> {
    try {
      // Verify estimate exists
      const estimate = await this.estimateRepository.findById(estimateId);
      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${estimateId} not found`);
      }

      // Calculate complexity and function points
      let complexity: ComplexityLevel;
      let functionPoints: number;

      // Check if we should use special dual calculation
      if (
        eqData.inputFtr !== undefined &&
        eqData.inputDet !== undefined &&
        eqData.outputFtr !== undefined &&
        eqData.outputDet !== undefined
      ) {
        // Use special EQ calculation
        const specialResult = ComplexityCalculator.calculateEQSpecialComplexity(
          eqData.inputFtr,
          eqData.inputDet,
          eqData.outputFtr,
          eqData.outputDet,
        );
        complexity = specialResult.finalComplexity;
        functionPoints = specialResult.finalFunctionPoints;
      } else {
        // Use standard calculation with required parameters
        const ftr = eqData.fileTypesReferenced ?? 0;
        const det = eqData.dataElementTypes ?? 1;

        const result = ComplexityCalculator.calculateEQComplexity(ftr, det);
        complexity = result.complexity;
        functionPoints = result.functionPoints;
      }

      // Prepare EQ data with calculated values
      const eqToCreate: Partial<EQ> = {
        ...eqData,
        projectId: estimate.projectId,
        organizationId: estimate.organizationId, // Add organizationId from estimate
        complexity,
        functionPoints,
      };

      // Create the EQ component
      const createdEQ = await this.eqRepository.create(eqToCreate);

      // Add reference to the estimate
      if (!estimate.externalQueries) {
        estimate.externalQueries = [];
      }
      estimate.externalQueries.push(createdEQ._id);
      await this.estimateRepository.update(estimateId, {
        externalQueries: estimate.externalQueries,
      });

      return createdEQ;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create EQ component: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all EQs for an estimate' })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all EQs for the estimate',
  })
  @ApiResponse({ status: 404, description: 'Estimate not found' })
  async findAll(@Param('estimateId') estimateId: string): Promise<EQ[]> {
    try {
      const estimate = await this.estimateRepository.findById(estimateId);
      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${estimateId} not found`);
      }

      if (!estimate.externalQueries || estimate.externalQueries.length === 0) {
        return [];
      }

      // Convert ObjectIds to strings
      const eqIds = estimate.externalQueries.map((id) => id.toString());
      return this.eqRepository.findByIds(eqIds);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch EQs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an EQ by ID' })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiParam({ name: 'id', description: 'The EQ ID' })
  @ApiResponse({ status: 200, description: 'Returns the EQ' })
  @ApiResponse({ status: 404, description: 'EQ or estimate not found' })
  async findOne(
    @Param('estimateId') estimateId: string,
    @Param('id') id: string,
  ): Promise<EQ> {
    try {
      // Verify estimate exists and contains this EQ
      const estimate = await this.estimateRepository.findById(estimateId);
      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${estimateId} not found`);
      }

      if (
        !estimate.externalQueries ||
        !estimate.externalQueries.some((eqId) => eqId.toString() === id)
      ) {
        throw new NotFoundException(
          `EQ with ID ${id} not found in estimate ${estimateId}`,
        );
      }

      const eq = await this.eqRepository.findById(id);
      if (!eq) {
        throw new NotFoundException(`EQ with ID ${id} not found`);
      }

      return eq;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch EQ: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an EQ' })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiParam({ name: 'id', description: 'The EQ ID' })
  @ApiResponse({ status: 200, description: 'EQ updated successfully' })
  @ApiResponse({ status: 404, description: 'EQ or estimate not found' })
  @ApiBody({ type: UpdateEQDto })
  async update(
    @Param('estimateId') estimateId: string,
    @Param('id') id: string,
    @Body() eqData: UpdateEQDto,
  ): Promise<EQ> {
    try {
      // Verify estimate exists and contains this EQ
      const estimate = await this.estimateRepository.findById(estimateId);
      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${estimateId} not found`);
      }

      if (
        !estimate.externalQueries ||
        !estimate.externalQueries.some((eqId) => eqId.toString() === id)
      ) {
        throw new NotFoundException(
          `EQ with ID ${id} not found in estimate ${estimateId}`,
        );
      }

      // Get current EQ to merge with updates
      const currentEQ = await this.eqRepository.findById(id);
      if (!currentEQ) {
        throw new NotFoundException(`EQ with ID ${id} not found`);
      }

      // Prepare update data with potential complexity recalculation
      const updateData: Partial<EQ> = { ...eqData };

      // Determine if we need to recalculate complexity
      const hasSpecialFieldsInUpdate =
        eqData.inputFtr !== undefined ||
        eqData.inputDet !== undefined ||
        eqData.outputFtr !== undefined ||
        eqData.outputDet !== undefined;

      const hasStandardFieldsInUpdate =
        eqData.fileTypesReferenced !== undefined ||
        eqData.dataElementTypes !== undefined;

      // Recalculate complexity if any relevant fields changed
      if (hasSpecialFieldsInUpdate || hasStandardFieldsInUpdate) {
        // Get merged values (update + current)
        const mergedInputFtr = eqData.inputFtr ?? currentEQ.inputFtr;
        const mergedInputDet = eqData.inputDet ?? currentEQ.inputDet;
        const mergedOutputFtr = eqData.outputFtr ?? currentEQ.outputFtr;
        const mergedOutputDet = eqData.outputDet ?? currentEQ.outputDet;

        // Check if we should use special calculation
        const useSpecialCalculation =
          mergedInputFtr !== undefined &&
          mergedInputDet !== undefined &&
          mergedOutputFtr !== undefined &&
          mergedOutputDet !== undefined;

        if (useSpecialCalculation) {
          // Use special EQ calculation
          const specialResult = ComplexityCalculator.calculateEQSpecialComplexity(
            mergedInputFtr,
            mergedInputDet,
            mergedOutputFtr,
            mergedOutputDet,
          );
          updateData.complexity = specialResult.finalComplexity;
          updateData.functionPoints = specialResult.finalFunctionPoints;
        } else {
          // Use standard calculation
          const fileTypesReferenced =
            eqData.fileTypesReferenced ?? currentEQ.fileTypesReferenced;
          const dataElementTypes =
            eqData.dataElementTypes ?? currentEQ.dataElementTypes;

          const { complexity, functionPoints } =
            ComplexityCalculator.calculateEQComplexity(
              fileTypesReferenced,
              dataElementTypes,
            );
          updateData.complexity = complexity;
          updateData.functionPoints = functionPoints;
        }
      }

      const updatedEQ = await this.eqRepository.update(id, updateData);
      if (!updatedEQ) {
        throw new NotFoundException(`EQ with ID ${id} not found`);
      }

      return updatedEQ;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update EQ: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an EQ from an estimate' })
  @ApiParam({ name: 'estimateId', description: 'The estimate ID' })
  @ApiParam({ name: 'id', description: 'The EQ ID' })
  @ApiResponse({ status: 200, description: 'EQ removed successfully' })
  @ApiResponse({ status: 404, description: 'EQ or estimate not found' })
  async remove(
    @Param('estimateId') estimateId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    try {
      // Verify estimate exists
      const estimate = await this.estimateRepository.findById(estimateId);
      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${estimateId} not found`);
      }

      // Remove reference from estimate
      if (estimate.externalQueries) {
        estimate.externalQueries = estimate.externalQueries.filter(
          (eqId) => eqId.toString() !== id,
        );
        await this.estimateRepository.update(estimateId, {
          externalQueries: estimate.externalQueries,
        });
      }

      // Delete the EQ
      const result = await this.eqRepository.delete(id);
      return { success: result };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to remove EQ: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
