import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '@domain/users/entities/user.entity';

export class UserInfoDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: 'Email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Whether the user has completed the onboarding tour',
    example: false,
  })
  hasCompletedOnboarding: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token, used to get a new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken?: string;

  @ApiProperty({
    description: 'User information',
    type: UserInfoDto,
  })
  user: UserInfoDto;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }

  static fromUser(
    user: User,
    accessToken: string,
    refreshToken?: string,
  ): AuthResponseDto {
    return new AuthResponseDto({
      accessToken,
      refreshToken,
      user: {
        id: user._id?.toString() || '',
        username: user.username,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding: !!user.hasCompletedOnboarding,
      },
    });
  }
}
