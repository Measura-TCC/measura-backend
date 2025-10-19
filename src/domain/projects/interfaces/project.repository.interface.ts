import { Project } from '@domain/projects/entities/project.entity';

export const PROJECT_REPOSITORY = 'PROJECT_REPOSITORY';

export interface IProjectRepository {
  create(project: Partial<Project>): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findByIds(ids: string[]): Promise<Project[]>;
  findAll(): Promise<Project[]>;
  findByOrganization(organizationId: string): Promise<Project[]>;
  update(id: string, project: Partial<Project>): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
  findByCreatedBy(userId: string): Promise<Project[]>;
}
