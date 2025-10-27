import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '@application/auth/use-cases/auth.service';
import { LoginDto } from '@application/auth/dtos/login.dto';
import { FirebaseLoginDto } from '@application/auth/dtos/firebase-login.dto';
import { RegisterDto } from '@application/auth/dtos/register.dto';
import { RefreshTokenDto } from '@application/auth/dtos/refresh-token.dto';
import { PasswordResetRequestDto } from '@application/auth/dtos/password-reset-request.dto';
import { PasswordResetDto } from '@application/auth/dtos/password-reset.dto';
import { ResendVerificationDto } from '@application/auth/dtos/resend-verification.dto';
import { Public } from '@shared/utils/decorators/public.decorator';
import { RateLimitGuard } from '@shared/utils/guards/rate-limit.guard';
import { JwtAuthGuard } from '@shared/utils/guards/jwt-auth.guard';
import { UserService } from '@application/users/use-cases/user.service';
import { OrganizationService } from '@application/organizations/use-cases/organization.service';
import { UserRole } from '@domain/users/entities/user.entity';
import { Organization } from '@domain/organizations/entities/organization.entity';

interface AuthenticatedRequest {
  user: {
    _id: string;
    email: string;
    role: UserRole;
    organizationId?: string;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request, validation failed' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/username and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('firebase-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Firebase' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid Firebase token' })
  async firebaseLogin(@Body() firebaseLoginDto: FirebaseLoginDto) {
    return this.authService.firebaseLogin(firebaseLoginDto);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Public()
  @Post('password-reset-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset instructions sent (if the account exists)',
  })
  async requestPasswordReset(
    @Body() passwordResetRequestDto: PasswordResetRequestDto,
  ) {
    await this.authService.requestPasswordReset(passwordResetRequestDto);
    return {
      message:
        'Password reset instructions sent to your email if the account exists',
    };
  }

  @Public()
  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    await this.authService.resetPassword(passwordResetDto);
    return { message: 'Password has been reset successfully' };
  }

  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using token' })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 401, description: 'Invalid verification token' })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email has been verified successfully' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async resendVerificationEmail(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    await this.authService.resendVerificationEmail(resendVerificationDto.email);
    return {
      message:
        'If this email is registered and unverified, a verification email has been sent.',
    };
  }

  @Public()
  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test email service (development only)' })
  @ApiResponse({ status: 200, description: 'Test email sent' })
  @ApiResponse({ status: 503, description: 'Email service unavailable' })
  async testEmail(@Body() body: { email: string }) {
    try {
      await this.authService.testEmailService(body.email);
      return { message: 'Test email sent successfully' };
    } catch (error) {
      return {
        message: 'Email service test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Public()
  @Get('debug-email-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Debug email configuration (development only)' })
  @ApiResponse({ status: 200, description: 'Email configuration details' })
  debugEmailConfig() {
    return this.authService.getEmailDebugInfo();
  }

  @Post('refresh-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token with latest user data',
    description:
      'Generates a new access token with updated user information (like organizationId). Use this after joining/creating an organization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed with latest user data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshSession(@Request() req: AuthenticatedRequest) {
    return this.authService.refreshSession(req.user._id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with organization' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.userService.findOne(req.user._id);
    let organization: Organization | null = null;

    if (user.organizationId) {
      try {
        organization = await this.organizationService.findOne(
          user.organizationId.toString(),
        );
      } catch {
        // Organization not found, continue without it
      }
    }

    return {
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      organization,
    };
  }
}
