import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  REQUIREMENT_REPOSITORY,
  IRequirementRepository,
} from '@domain/fpa/interfaces/requirement.repository.interface';
import {
  Requirement,
  FPAComponentType,
} from '@domain/fpa/entities/requirement.entity';
import {
  ALI_REPOSITORY,
  IALIRepository,
} from '@domain/fpa/interfaces/ali.repository.interface';
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
import {
  AIE_REPOSITORY,
  IAIERepository,
} from '@domain/fpa/interfaces/aie.repository.interface';
import { CreateRequirementDto } from '../dtos/requirement/create-requirement.dto';
import { UpdateRequirementDto } from '../dtos/requirement/update-requirement.dto';

@Injectable()
export class RequirementService {
  constructor(
    @Inject(REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: IRequirementRepository,
    @Inject(ALI_REPOSITORY)
    private readonly aliRepository: IALIRepository,
    @Inject(EI_REPOSITORY)
    private readonly eiRepository: IEIRepository,
    @Inject(EO_REPOSITORY)
    private readonly eoRepository: IEORepository,
    @Inject(EQ_REPOSITORY)
    private readonly eqRepository: IEQRepository,
    @Inject(AIE_REPOSITORY)
    private readonly aieRepository: IAIERepository,
  ) {}

  /**
   * Get all requirements for an estimate
   */
  async getByEstimate(estimateId: string): Promise<Requirement[]> {
    return this.requirementRepository.findByEstimate(estimateId);
  }

  /**
   * Add a new requirement to an estimate
   */
  async addRequirement(
    estimateId: string,
    createDto: CreateRequirementDto,
    organizationId: string,
    projectId: string,
  ): Promise<Requirement> {
    const requirement: Partial<Requirement> = {
      ...createDto,
      estimateId: new Types.ObjectId(estimateId),
      organizationId: new Types.ObjectId(organizationId),
      projectId: new Types.ObjectId(projectId),
    };

    return this.requirementRepository.create(requirement);
  }

  /**
   * Update a requirement
   */
  async updateRequirement(
    id: string,
    updateDto: UpdateRequirementDto,
  ): Promise<Requirement> {
    const requirement = await this.requirementRepository.findById(id);
    if (!requirement) {
      throw new NotFoundException(`Requirement with ID ${id} not found`);
    }

    const updated = await this.requirementRepository.update(id, updateDto);
    if (!updated) {
      throw new BadRequestException(
        `Failed to update requirement with ID ${id}`,
      );
    }

    return updated;
  }

  /**
   * Delete a requirement and its associated FPA component
   */
  async deleteRequirement(id: string): Promise<boolean> {
    const requirement = await this.requirementRepository.findById(id);
    if (!requirement) {
      throw new NotFoundException(`Requirement with ID ${id} not found`);
    }

    // Delete associated component if exists
    if (requirement.componentId && requirement.componentType) {
      const componentId = requirement.componentId.toString();

      try {
        switch (requirement.componentType) {
          case 'ALI':
            await this.aliRepository.delete(componentId);
            break;
          case 'EI':
            await this.eiRepository.delete(componentId);
            break;
          case 'EO':
            await this.eoRepository.delete(componentId);
            break;
          case 'EQ':
            await this.eqRepository.delete(componentId);
            break;
          case 'AIE':
            await this.aieRepository.delete(componentId);
            break;
        }
      } catch (error) {
        // Log but don't fail - component might already be deleted
        console.warn(
          `Failed to delete component ${componentId} for requirement ${id}:`,
          error,
        );
      }
    }

    return this.requirementRepository.delete(id);
  }

  /**
   * Find a requirement by source reference
   */
  async findBySource(
    estimateId: string,
    source: string,
    sourceReference: string,
  ): Promise<Requirement | null> {
    return this.requirementRepository.findBySource(
      estimateId,
      source,
      sourceReference,
    );
  }
}
