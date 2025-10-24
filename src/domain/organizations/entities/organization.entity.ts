import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type OrganizationDocument = Organization & Document;

export enum ObjectivePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ObjectiveStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

export interface OrganizationalObjective {
  _id: Types.ObjectId;
  title: string;
  description: string;
  priority: ObjectivePriority;
  status: ObjectiveStatus;
  targetDate?: Date;
  completionDate?: Date;
  progress?: number;
}

export interface JiraIntegration {
  domain: string;
  email: string;
  apiToken: string;
  enabled: boolean;
  configuredBy: Types.ObjectId;
  configuredAt: Date;
  lastUsedAt?: Date;
}

export interface GitHubIntegration {
  token: string;
  enabled: boolean;
  configuredBy: Types.ObjectId;
  configuredAt: Date;
  lastUsedAt?: Date;
}

export interface ClickUpIntegration {
  token: string;
  enabled: boolean;
  configuredBy: Types.ObjectId;
  configuredAt: Date;
  lastUsedAt?: Date;
}

export interface AzureDevOpsIntegration {
  organization: string;
  pat: string;
  enabled: boolean;
  configuredBy: Types.ObjectId;
  configuredAt: Date;
  lastUsedAt?: Date;
}

export interface OrganizationIntegrations {
  jira?: JiraIntegration;
  github?: GitHubIntegration;
  clickup?: ClickUpIntegration;
  azureDevops?: AzureDevOpsIntegration;
}

@Schema({ timestamps: true })
export class Organization {
  @ApiProperty({ description: 'The unique identifier of the organization' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The name of the organization' })
  @Prop({ required: true, unique: true })
  name: string;

  @ApiProperty({ description: 'The description of the organization' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'The website URL of the organization' })
  @Prop()
  website?: string;

  @ApiProperty({ description: 'The industry of the organization' })
  @Prop()
  industry?: string;

  @ApiProperty({ description: 'The mission statement of the organization' })
  @Prop({ maxlength: 2000 })
  mission?: string;

  @ApiProperty({ description: 'The vision statement of the organization' })
  @Prop({ maxlength: 2000 })
  vision?: string;

  @ApiProperty({ description: 'The core values of the organization' })
  @Prop({ maxlength: 2000 })
  values?: string;

  @ApiProperty({
    description: 'The organizational objectives',
    type: [Object],
  })
  @Prop({ type: [Object], default: [] })
  objectives: OrganizationalObjective[];

  @ApiProperty({
    description: 'Legacy organizational objectives (newline-separated list) - DEPRECATED',
    required: false,
  })
  @Prop({ maxlength: 5000 })
  organizationalObjectives?: string;

  @ApiProperty({
    description: 'External integrations configuration (Jira, GitHub, ClickUp, Azure DevOps)',
    type: Object,
    required: false,
  })
  @Prop({ type: Object, default: {} })
  integrations?: OrganizationIntegrations;

  @ApiProperty({
    description: 'The ID of the user who created the organization',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: 'The date when the organization was created' })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the organization was last updated',
  })
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.index({ 'objectives._id': 1 });
OrganizationSchema.index({ 'objectives.status': 1 });
OrganizationSchema.index({ 'objectives.priority': 1 });
OrganizationSchema.index({ 'integrations.jira.enabled': 1 });
OrganizationSchema.index({ 'integrations.github.enabled': 1 });
OrganizationSchema.index({ 'integrations.clickup.enabled': 1 });
OrganizationSchema.index({ 'integrations.azureDevops.enabled': 1 });
