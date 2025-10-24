import { ApiProperty } from '@nestjs/swagger';

export class IntegrationStatusDto {
  @ApiProperty({ description: 'Whether integration is configured' })
  configured: boolean;

  @ApiProperty({ description: 'Whether integration is enabled', required: false })
  enabled?: boolean;

  @ApiProperty({ description: 'Domain or organization specific identifier', required: false })
  identifier?: string;

  @ApiProperty({ description: 'User who configured the integration', required: false, type: Object })
  configuredBy?: {
    _id: string;
    email: string;
    username: string;
  };

  @ApiProperty({ description: 'Date when integration was configured', required: false })
  configuredAt?: Date;

  @ApiProperty({ description: 'Date when integration was last used', required: false })
  lastUsedAt?: Date;
}

export class IntegrationsStatusResponseDto {
  @ApiProperty({ description: 'Jira integration status', type: IntegrationStatusDto })
  jira: IntegrationStatusDto;

  @ApiProperty({ description: 'GitHub integration status', type: IntegrationStatusDto })
  github: IntegrationStatusDto;

  @ApiProperty({ description: 'ClickUp integration status', type: IntegrationStatusDto })
  clickup: IntegrationStatusDto;

  @ApiProperty({ description: 'Azure DevOps integration status', type: IntegrationStatusDto })
  azureDevops: IntegrationStatusDto;
}
