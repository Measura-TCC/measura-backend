import { Requirement } from '../entities/requirement.entity';

export const REQUIREMENT_REPOSITORY = 'REQUIREMENT_REPOSITORY';

export interface IRequirementRepository {
  create(requirement: Partial<Requirement>): Promise<Requirement>;
  findById(id: string): Promise<Requirement | null>;
  findByEstimate(estimateId: string): Promise<Requirement[]>;
  findBySource(
    estimateId: string,
    source: string,
    sourceReference: string,
  ): Promise<Requirement | null>;
  update(
    id: string,
    requirement: Partial<Requirement>,
  ): Promise<Requirement | null>;
  delete(id: string): Promise<boolean>;
}
