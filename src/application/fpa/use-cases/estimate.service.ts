import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ESTIMATE_REPOSITORY,
  IEstimateRepository,
} from '@domain/fpa/interfaces/estimate.repository.interface';
import { Estimate, EstimateStatus } from '@domain/fpa/entities/estimate.entity';
import { CreateEstimateDto } from '../dtos/create-estimate.dto';
import { UpdateEstimateDto } from '../dtos/update-estimate.dto';
import { ProjectService } from '@application/projects/use-cases/project.service';
import {
  REQUIREMENT_REPOSITORY,
  IRequirementRepository,
} from '@domain/fpa/interfaces/requirement.repository.interface';
import {
  ALI_REPOSITORY,
  IALIRepository,
} from '@domain/fpa/interfaces/ali.repository.interface';
import {
  AIE_REPOSITORY,
  IAIERepository,
} from '@domain/fpa/interfaces/aie.repository.interface';
import {
  EI_REPOSITORY,
  IEIRepository,
} from '@domain/fpa/interfaces/ei.repository.interface';
import {
  EO_REPOSITORY,
  IEORepository,
} from '@domain/fpa/interfaces/eo.repository.interface';
import {
  EQ_REPOSITORY,
  IEQRepository,
} from '@domain/fpa/interfaces/eq.repository.interface';
import { ComplexityCalculator } from '@domain/fpa/services/complexity-calculator.service';
import { RequirementWithFpaDataDto } from '../dtos/requirement/requirement-with-fpa-data.dto';
import { CreateALIDto } from '../dtos/create-ali.dto';
import { CreateAIEDto } from '../dtos/create-aie.dto';
import { CreateEIDto } from '../dtos/create-ei.dto';
import { CreateEODto } from '../dtos/create-eo.dto';
import { CreateEQDto } from '../dtos/create-eq.dto';

@Injectable()
export class EstimateService {
  constructor(
    @Inject(ESTIMATE_REPOSITORY)
    private readonly estimateRepository: IEstimateRepository,
    private readonly projectService: ProjectService,
    @Inject(REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: IRequirementRepository,
    @Inject(ALI_REPOSITORY)
    private readonly aliRepository: IALIRepository,
    @Inject(AIE_REPOSITORY)
    private readonly aieRepository: IAIERepository,
    @Inject(EI_REPOSITORY)
    private readonly eiRepository: IEIRepository,
    @Inject(EO_REPOSITORY)
    private readonly eoRepository: IEORepository,
    @Inject(EQ_REPOSITORY)
    private readonly eqRepository: IEQRepository,
  ) {}

  async create(
    createDto: CreateEstimateDto,
    userId: string,
    organizationId: string,
  ): Promise<Estimate> {
    // Validate that the project belongs to the same organization
    const project = await this.projectService.findOne(createDto.projectId);
    if (project.organizationId.toString() !== organizationId) {
      throw new ForbiddenException(
        'Cannot create estimate for project from different organization',
      );
    }

    // Check if project already has an estimate
    if (project.estimateId) {
      throw new BadRequestException(
        'Project already has an associated estimate. Each project can have only one estimate.',
      );
    }

    const estimate: Partial<Estimate> = {
      ...createDto,
      createdBy: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
      projectId: new Types.ObjectId(createDto.projectId),
      status: EstimateStatus.DRAFT,
      version: 1,
      // Convert string arrays to ObjectId arrays (legacy approach - deprecated)
      internalLogicalFiles: createDto.internalLogicalFiles?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalInterfaceFiles: createDto.externalInterfaceFiles?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalInputs: createDto.externalInputs?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalOutputs: createDto.externalOutputs?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalQueries: createDto.externalQueries?.map(
        (id) => new Types.ObjectId(id),
      ),
    };

    const createdEstimate = await this.estimateRepository.create(estimate);

    // Process requirements-first approach (IFPUG-compliant)
    if (createDto.requirements && createDto.requirements.length > 0) {
      await this.createComponentsFromRequirements(
        createDto.requirements,
        createdEstimate._id.toString(),
        organizationId,
        createDto.projectId,
      );
    }

    // Auto-link the estimate to the project
    if (createDto.projectId) {
      try {
        const project = await this.projectService.findOne(createDto.projectId);

        // Ensure project belongs to the same organization
        if (project.organizationId.toString() === organizationId) {
          await this.projectService.update(createDto.projectId, {
            estimateId: createdEstimate._id.toString(),
          });
        }
      } catch (error) {
        // If project linking fails, log error but don't fail the estimate creation
        console.warn('Failed to link estimate to project:', error);
      }
    }

    // Format decimal values before returning
    return this.formatEstimateDecimals(createdEstimate);
  }

  async findAll(
    organizationId: string,
    projectId?: string,
  ): Promise<Estimate[]> {
    let estimates: Estimate[];
    if (projectId) {
      estimates = await this.estimateRepository.findByProject(projectId);
    } else {
      estimates =
        await this.estimateRepository.findByOrganization(organizationId);
    }

    // Format decimal values for all estimates
    return estimates.map((estimate) => this.formatEstimateDecimals(estimate));
  }

  async findOne(id: string, organizationId: string): Promise<Estimate> {
    const estimate = await this.estimateRepository.findById(id);
    if (!estimate) {
      throw new NotFoundException(`Estimate with ID ${id} not found`);
    }

    if (estimate.organizationId.toString() !== organizationId) {
      throw new ForbiddenException('Access denied to this estimate');
    }

    return this.formatEstimateDecimals(estimate);
  }

  private formatEstimateDecimals(estimate: Estimate): Estimate {
    return {
      ...estimate,
      valueAdjustmentFactor: this.roundToTwo(estimate.valueAdjustmentFactor),
      adjustedFunctionPoints: this.roundToTwo(estimate.adjustedFunctionPoints),
      estimatedEffortHours: this.roundToTwo(estimate.estimatedEffortHours),
      hourlyRateBRL: this.roundToTwo(estimate.hourlyRateBRL),
    };
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Process requirements and create FPA components with bidirectional traceability
   * This implements the IFPUG-compliant requirements-first workflow
   */
  private async createComponentsFromRequirements(
    requirements: RequirementWithFpaDataDto[],
    estimateId: string,
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const componentIdsByType: {
      internalLogicalFiles: Types.ObjectId[];
      externalInterfaceFiles: Types.ObjectId[];
      externalInputs: Types.ObjectId[];
      externalOutputs: Types.ObjectId[];
      externalQueries: Types.ObjectId[];
    } = {
      internalLogicalFiles: [],
      externalInterfaceFiles: [],
      externalInputs: [],
      externalOutputs: [],
      externalQueries: [],
    };

    for (const reqDto of requirements) {
      try {
        // Step 1: Create the FPA component based on type
        let componentId: Types.ObjectId | null = null;

        switch (reqDto.componentType) {
          case 'ALI': {
            const aliData = reqDto.fpaData as CreateALIDto;
            const { complexity, functionPoints } =
              ComplexityCalculator.calculateILFComplexity(
                aliData.recordElementTypes || 1,
                aliData.dataElementTypes || 1,
              );
            const ali = await this.aliRepository.create({
              ...aliData,
              complexity,
              functionPoints,
              organizationId: new Types.ObjectId(organizationId),
              projectId: new Types.ObjectId(projectId),
            });
            componentId = ali._id;
            componentIdsByType.internalLogicalFiles.push(ali._id);
            break;
          }

          case 'AIE': {
            const aieData = reqDto.fpaData as CreateAIEDto;
            const { complexity, functionPoints } =
              ComplexityCalculator.calculateEIFComplexity(
                aieData.recordElementTypes || 1,
                aieData.dataElementTypes || 1,
              );
            const aie = await this.aieRepository.create({
              ...aieData,
              complexity,
              functionPoints,
              organizationId: new Types.ObjectId(organizationId),
              projectId: new Types.ObjectId(projectId),
            });
            componentId = aie._id;
            componentIdsByType.externalInterfaceFiles.push(aie._id);
            break;
          }

          case 'EI': {
            const eiData = reqDto.fpaData as CreateEIDto;
            const { complexity, functionPoints } =
              ComplexityCalculator.calculateEIComplexity(
                eiData.fileTypesReferenced || 0,
                eiData.dataElementTypes || 1,
              );
            const ei = await this.eiRepository.create({
              ...eiData,
              complexity,
              functionPoints,
              organizationId: new Types.ObjectId(organizationId),
              projectId: new Types.ObjectId(projectId),
            });
            componentId = ei._id;
            componentIdsByType.externalInputs.push(ei._id);
            break;
          }

          case 'EO': {
            const eoData = reqDto.fpaData as CreateEODto;
            const { complexity, functionPoints } =
              ComplexityCalculator.calculateEOComplexity(
                eoData.fileTypesReferenced || 0,
                eoData.dataElementTypes || 1,
              );
            const eo = await this.eoRepository.create({
              ...eoData,
              complexity,
              functionPoints,
              organizationId: new Types.ObjectId(organizationId),
              projectId: new Types.ObjectId(projectId),
            });
            componentId = eo._id;
            componentIdsByType.externalOutputs.push(eo._id);
            break;
          }

          case 'EQ': {
            const eqData = reqDto.fpaData as CreateEQDto;
            const { complexity, functionPoints } =
              ComplexityCalculator.calculateEQComplexity(
                eqData.fileTypesReferenced || 0,
                eqData.dataElementTypes || 1,
              );
            const eq = await this.eqRepository.create({
              ...eqData,
              complexity,
              functionPoints,
              organizationId: new Types.ObjectId(organizationId),
              projectId: new Types.ObjectId(projectId),
            });
            componentId = eq._id;
            componentIdsByType.externalQueries.push(eq._id);
            break;
          }

          default:
            throw new BadRequestException(
              `Unknown component type: ${reqDto.componentType}`,
            );
        }

        // Step 2: Create the Requirement record with bidirectional link
        await this.requirementRepository.create({
          title: reqDto.title,
          description: reqDto.description,
          source: reqDto.source,
          sourceReference: reqDto.sourceReference,
          componentType: reqDto.componentType,
          componentId: componentId,
          estimateId: new Types.ObjectId(estimateId),
          organizationId: new Types.ObjectId(organizationId),
          projectId: new Types.ObjectId(projectId),
        });
      } catch (error) {
        throw new BadRequestException(
          `Failed to create component from requirement "${reqDto.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Step 3: Update the estimate with all component IDs
    await this.estimateRepository.update(estimateId, {
      internalLogicalFiles: componentIdsByType.internalLogicalFiles,
      externalInterfaceFiles: componentIdsByType.externalInterfaceFiles,
      externalInputs: componentIdsByType.externalInputs,
      externalOutputs: componentIdsByType.externalOutputs,
      externalQueries: componentIdsByType.externalQueries,
    });
  }

  async update(
    id: string,
    updateDto: UpdateEstimateDto,
    organizationId: string,
  ): Promise<Estimate> {
    await this.findOne(id, organizationId);

    // Convert string arrays to ObjectId arrays for update
    const updateData: Partial<Estimate> = {
      ...updateDto,
      internalLogicalFiles: updateDto.internalLogicalFiles?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalInterfaceFiles: updateDto.externalInterfaceFiles?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalInputs: updateDto.externalInputs?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalOutputs: updateDto.externalOutputs?.map(
        (id) => new Types.ObjectId(id),
      ),
      externalQueries: updateDto.externalQueries?.map(
        (id) => new Types.ObjectId(id),
      ),
    };

    const updatedEstimate = await this.estimateRepository.update(
      id,
      updateData,
    );
    if (!updatedEstimate) {
      throw new NotFoundException(`Failed to update estimate with ID ${id}`);
    }

    return this.formatEstimateDecimals(updatedEstimate);
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const existingEstimate = await this.findOne(id, organizationId);

    // Unlink from project before deletion
    if (existingEstimate.projectId) {
      try {
        await this.projectService.update(
          existingEstimate.projectId.toString(),
          {
            estimateId: undefined,
          },
        );
      } catch (error) {
        console.warn('Failed to unlink estimate from project:', error);
      }
    }

    const result = await this.estimateRepository.delete(id);
    if (!result) {
      throw new NotFoundException(`Failed to delete estimate with ID ${id}`);
    }
    return true;
  }

  async createNewVersion(
    id: string,
    organizationId: string,
  ): Promise<Estimate> {
    await this.findOne(id, organizationId);

    const newVersion = await this.estimateRepository.createNewVersion(id);
    if (!newVersion) {
      throw new NotFoundException(
        `Failed to create new version for estimate ${id}`,
      );
    }

    return this.formatEstimateDecimals(newVersion);
  }
}
