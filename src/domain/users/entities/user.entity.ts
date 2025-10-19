import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PROJECT_MANAGER = 'project-manager',
  MEASUREMENT_ANALYST = 'measurement-analyst',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ description: 'The unique identifier of the user' })
  _id: Types.ObjectId;

  @ApiProperty({ description: 'The email of the user' })
  @Prop({ required: true, unique: true })
  email: string;

  @ApiProperty({ description: 'The username of the user' })
  @Prop({ required: true, unique: true })
  username: string;

  @ApiProperty({ description: 'The first name of the user' })
  @Prop()
  firstName?: string;

  @ApiProperty({ description: 'The last name of the user' })
  @Prop()
  lastName?: string;

  @ApiProperty({
    description: 'The hashed password of the user (only for local auth)',
  })
  @Prop({ required: false })
  password?: string;

  @ApiProperty({
    description: 'The role of the user',
    enum: UserRole,
    default: UserRole.USER,
  })
  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @ApiProperty({ description: 'Whether the user is active', default: true })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'The authentication provider',
    enum: AuthProvider,
  })
  @Prop({ type: String, enum: AuthProvider, required: true })
  provider: AuthProvider;

  @ApiProperty({ description: 'Whether the email is verified', default: false })
  @Prop({ default: false })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Email verification token' })
  @Prop()
  verificationToken?: string;

  @ApiProperty({ description: 'Email verification token expiration date' })
  @Prop()
  verificationTokenExpires?: Date;

  @ApiProperty({ description: 'Refresh token for JWT authentication' })
  @Prop()
  refreshToken?: string;

  @ApiProperty({ description: 'Password reset token' })
  @Prop()
  resetToken?: string;

  @ApiProperty({ description: 'Password reset token expiration date' })
  @Prop()
  resetTokenExpires?: Date;

  @ApiProperty({ description: 'The organization this user belongs to' })
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false })
  organizationId?: Types.ObjectId;

  @ApiProperty({
    description: 'Whether the user has completed the onboarding tour',
    default: false,
  })
  @Prop({ default: false })
  hasCompletedOnboarding: boolean;

  @ApiProperty({ description: 'The date when the user was created' })
  createdAt: Date;

  @ApiProperty({ description: 'The date when the user was last updated' })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
