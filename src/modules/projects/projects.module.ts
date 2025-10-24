import { Module, Logger, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Project,
  ProjectSchema,
} from '@domain/projects/entities/project.entity';
import { ProjectRepository } from '@infrastructure/repositories/projects/project.repository';
import { PROJECT_REPOSITORY } from '@domain/projects/interfaces/project.repository.interface';
import { ProjectService } from '@application/projects/use-cases/project.service';
import { ProjectController } from '@controllers/projects/project.controller';
import { MeasurementPlansModule } from '@modules/measurement-plans/measurement-plans.module';
import { FPAModule } from '@modules/fpa/fpa.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    forwardRef(() => MeasurementPlansModule),
    forwardRef(() => FPAModule),
  ],
  controllers: [ProjectController],
  providers: [
    Logger,
    {
      provide: PROJECT_REPOSITORY,
      useClass: ProjectRepository,
    },
    ProjectService,
  ],
  exports: [PROJECT_REPOSITORY, ProjectService],
})
export class ProjectsModule {}
