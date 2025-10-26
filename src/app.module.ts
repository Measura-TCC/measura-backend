import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';

import { AppController } from './app.controller';
import { FilesController } from '@controllers/files/files.controller';

// Business Logic Modules
import { AuthModule } from '@app/modules/auth/auth.module';
import { ProjectsModule } from '@app/modules/projects/projects.module';
import { FPAModule } from '@app/modules/fpa/fpa.module';
import { UsersModule } from '@app/modules/users/users.module';
import { OrganizationsModule } from '@app/modules/organizations/organizations.module';
import { MeasurementPlansModule } from '@modules/measurement-plans/measurement-plans.module';
import { OrganizationInvitationsModule } from '@app/modules/organization-invitations/organization-invitations.module';
import { IntegrationsModule } from '@modules/integrations/integrations.module';

// Controller Modules
import { EstimatesModule } from '@controllers/fpa/estimates.module';
import { EstimatesComponentsModule } from '@controllers/fpa/estimates-components.module';
import { OrganizationsControllerModule } from '@controllers/organizations/organizations.module';
import { ProjectsControllerModule } from '@controllers/projects/projects.module';
import { OrganizationInvitationsControllerModule } from '@controllers/organization-invitations/organization-invitations.module';

// Config Modules
import appConfig from '@app/config/app.config';

import { winstonConfig } from '@app/config/winston.config';
import { MigrateOrganizationalObjectivesService } from './migrations/migrate-organizational-objectives.service';
import { Organization, OrganizationSchema } from '@domain/organizations/entities/organization.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
      load: [appConfig],
    }),

    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('app.mongodb.uri'),
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
    ]),

    WinstonModule.forRoot(winstonConfig),

    // Business Logic Modules
    AuthModule,
    ProjectsModule,
    FPAModule,
    UsersModule,
    OrganizationsModule,
    MeasurementPlansModule,
    OrganizationInvitationsModule,
    IntegrationsModule,

    // Controller Modules
    EstimatesModule,
    EstimatesComponentsModule,
    OrganizationsControllerModule,
    ProjectsControllerModule,
    OrganizationInvitationsControllerModule,
  ],
  controllers: [AppController, FilesController],
  providers: [MigrateOrganizationalObjectivesService],
})
export class AppModule {}
