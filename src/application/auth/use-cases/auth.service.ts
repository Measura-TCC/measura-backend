import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  ConflictException,
  Logger,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  AuthProvider,
  UserRole,
} from '@domain/users/entities/user.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@domain/users/interfaces/user.repository.interface';
import { LoginDto } from '@application/auth/dtos/login.dto';
import { FirebaseLoginDto } from '@application/auth/dtos/firebase-login.dto';
import { RegisterDto } from '@application/auth/dtos/register.dto';
import { RefreshTokenDto } from '@application/auth/dtos/refresh-token.dto';
import { PasswordResetRequestDto } from '@application/auth/dtos/password-reset-request.dto';
import { PasswordResetDto } from '@application/auth/dtos/password-reset.dto';
import { AuthResponseDto } from '@application/auth/dtos/auth-response.dto';
import { FirebaseAdminService } from '@infrastructure/external-services/firebase/firebase-admin.service';
import { EmailService } from '@infrastructure/external-services/email/email.service';
import * as admin from 'firebase-admin';

/**
 * ========================================
 * TEMPORARY EMAIL VERIFICATION DISABLED
 * ========================================
 *
 * The following changes have been made temporarily for development purposes:
 *
 * 1. In validateUser() method (lines ~65-69):
 *    - Email verification check is commented out
 *    - Users can login without verifying their email
 *
 * 2. In register() method (lines ~108):
 *    - New users are created with isEmailVerified: true
 *    - This allows immediate login after registration
 *
 * TO RE-ENABLE EMAIL VERIFICATION:
 * 1. Uncomment the email verification check in validateUser()
 * 2. Change isEmailVerified: true back to isEmailVerified: false in register()
 *
 * ========================================
 */

interface FirebaseAuthUser {
  email: string;
  name?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(login: string, password: string): Promise<User> {
    const user = await this.userRepository.findByEmailOrUsername(login);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException(
        `This account was created using ${user.provider} authentication`,
      );
    }

    // TODO: TEMPORARILY DISABLED - Remove this comment to re-enable email verification
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException(
    //     'Please verify your email address before logging in. Check your inbox for a verification email.',
    //   );
    // }

    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(
      loginDto.usernameOrEmail,
      loginDto.password,
    );
    return this.generateToken(user);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingEmail = await this.userRepository.findByEmail(
      registerDto.email,
    );
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.userRepository.findByUsername(
      registerDto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = String(uuidv4());
    const hashedVerificationToken = await bcrypt.hash(verificationToken, 10);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = await this.userRepository.create({
      email: registerDto.email,
      username: registerDto.username,
      password: hashedPassword,
      provider: AuthProvider.LOCAL,
      role: registerDto.role || UserRole.USER,
      isActive: true,
      isEmailVerified: true,
    });

    if (newUser && newUser._id) {
      const userId = newUser._id.toString();
      await this.userRepository.setVerificationToken(
        userId,
        hashedVerificationToken,
        verificationTokenExpires,
      );
      if (typeof newUser.email === 'string') {
        try {
          await this.emailService.sendVerificationEmail(
            newUser.email,
            verificationToken,
          );
          this.logger.log(
            `Verification email sent successfully to ${newUser.email}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send verification email to ${newUser.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Don't throw error here - user is still created, they can request resend
          this.logger.warn(
            `User ${userId} created but verification email failed to send`,
          );
        }
      }
    }

    return this.generateToken(newUser);
  }

  async firebaseLogin(
    firebaseLoginDto: FirebaseLoginDto,
  ): Promise<AuthResponseDto> {
    try {
      const decodedToken = await this.firebaseAdminService.verifyIdToken(
        firebaseLoginDto.idToken,
      );
      const firebaseUser = this.extractFirebaseUserInfo(decodedToken);
      let user = await this.userRepository.findByProviderAndEmail(
        AuthProvider.GOOGLE,
        firebaseUser.email,
      );

      if (!user) {
        const nameBase = firebaseUser.name || firebaseUser.email.split('@')[0];
        const username = await this.generateUniqueUsername(nameBase);

        user = await this.userRepository.create({
          email: firebaseUser.email,
          username,
          provider: AuthProvider.GOOGLE,
          role: UserRole.USER,
          isActive: true,
          isEmailVerified: true,
        });
      }

      return this.generateToken(user);
    } catch (error) {
      this.logger.error(
        `Firebase login error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to authenticate with Firebase');
    }
  }

  private extractFirebaseUserInfo(
    decodedToken: admin.auth.DecodedIdToken,
  ): FirebaseAuthUser {
    const email = decodedToken.email;
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Email is required for authentication');
    }

    let name: string | undefined = undefined;
    if (decodedToken.name && typeof decodedToken.name === 'string') {
      name = decodedToken.name;
    }

    return { email, name };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        tokenType: string;
      }>(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
      });
      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (!user.refreshToken) {
        this.logger.warn(
          `User ${user._id.toString()} attempted refresh with no stored token`,
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isTokenValid = await bcrypt.compare(
        refreshTokenDto.refreshToken,
        user.refreshToken,
      );

      if (!isTokenValid) {
        this.logger.warn(
          `Invalid refresh token for user ${user._id.toString()}`,
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateToken(user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Refresh token error: ${errorMessage}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async requestPasswordReset(
    passwordResetRequestDto: PasswordResetRequestDto,
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(
      passwordResetRequestDto.email,
    );

    if (!user) {
      this.logger.debug(
        `Password reset requested for non-existent email: ${passwordResetRequestDto.email}`,
      );
      return;
    }

    if (user.provider !== AuthProvider.LOCAL) {
      this.logger.debug(
        `Password reset attempted for non-local account: ${passwordResetRequestDto.email} (${user.provider})`,
      );
      return;
    }

    const resetToken = String(uuidv4());
    const hashedResetToken = await bcrypt.hash(resetToken, 10);

    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);
    if (user._id && typeof user._id.toString === 'function') {
      const userId = user._id.toString();
      await this.userRepository.setResetToken(
        userId,
        hashedResetToken,
        resetTokenExpires,
      );

      if (typeof user.email === 'string') {
        try {
          await this.emailService.sendPasswordResetEmail(
            user.email,
            resetToken,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send password reset email to ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }
  }

  async resetPassword(passwordResetDto: PasswordResetDto): Promise<void> {
    if (!passwordResetDto.token) {
      throw new BadRequestException('Reset token is required');
    }

    if (passwordResetDto.password !== passwordResetDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      const users = await this.userRepository.findAllWithResetTokens();
      if (!users || users.length === 0) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      const now = new Date();
      let matchedUser: User | null = null;

      for (const user of users) {
        if (user.resetTokenExpires && user.resetTokenExpires < now) {
          continue;
        }
        if (user.resetToken) {
          try {
            const isMatch = await bcrypt.compare(
              passwordResetDto.token,
              user.resetToken,
            );
            if (isMatch) {
              matchedUser = user;
              break;
            }
          } catch (error) {
            this.logger.error(
              `Error comparing reset tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }

      if (!matchedUser) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(passwordResetDto.password, 10);

      if (matchedUser._id && typeof matchedUser._id.toString === 'function') {
        const userId = matchedUser._id.toString();
        try {
          await this.userRepository.update(userId, {
            password: hashedPassword,
          });

          await this.userRepository.clearResetToken(userId);
        } catch (error) {
          this.logger.error(
            `Failed to reset password for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          throw new InternalServerErrorException('Failed to reset password');
        }
      }
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(
        `Error resetting password: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    try {
      const users = await this.userRepository.findAllWithVerificationTokens();
      if (!users || users.length === 0) {
        throw new UnauthorizedException('Invalid verification token');
      }

      let matchedUser: User | null = null;

      for (const user of users) {
        if (user.verificationToken) {
          try {
            const isMatch = await bcrypt.compare(token, user.verificationToken);
            if (isMatch) {
              matchedUser = user;
              break;
            }
          } catch (error) {
            this.logger.error(
              `Error comparing verification tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }

      if (!matchedUser) {
        throw new UnauthorizedException('Invalid verification token');
      }

      if (
        matchedUser.verificationTokenExpires &&
        matchedUser.verificationTokenExpires < new Date()
      ) {
        throw new UnauthorizedException('Verification token has expired');
      }

      if (matchedUser._id && typeof matchedUser._id.toString === 'function') {
        const userId = matchedUser._id.toString();
        await this.userRepository.markEmailAsVerified(userId);
      }
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error verifying email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to verify email');
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists for security reasons
      this.logger.debug(
        `Verification email resend requested for non-existent email: ${email}`,
      );
      return;
    }

    if (user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException(
        'This account was not created with email/password',
      );
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = String(uuidv4());
    const hashedVerificationToken = await bcrypt.hash(verificationToken, 10);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    if (user._id && typeof user._id.toString === 'function') {
      const userId = user._id.toString();
      await this.userRepository.setVerificationToken(
        userId,
        hashedVerificationToken,
        verificationTokenExpires,
      );

      try {
        await this.emailService.sendVerificationEmail(email, verificationToken);
        this.logger.log(`Verification email resent to ${email}`);
      } catch (error) {
        this.logger.error(
          `Failed to resend verification email to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw new ServiceUnavailableException(
          'Failed to send verification email',
        );
      }
    }
  }

  async testEmailService(email: string): Promise<void> {
    try {
      const testSubject = 'Measura Email Service Test';
      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Service Test</h2>
          <p>This is a test email to verify that the Measura email service is working correctly.</p>
          <p>If you received this email, the email configuration is working properly.</p>
          <p>Time sent: ${new Date().toISOString()}</p>
          <p>Best regards,<br>The Measura Team</p>
        </div>
      `;

      await this.emailService.sendEmail(email, testSubject, testHtml);
      this.logger.log(`Test email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Test email failed for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  getEmailDebugInfo(): Record<string, any> {
    return {
      emailHost: this.configService.get<string>('app.email.host'),
      emailPort: this.configService.get<number>('app.email.port'),
      emailUser: this.configService.get<string>('app.email.user'),
      emailFrom: this.configService.get<string>('app.email.from'),
      frontendUrl: this.configService.get<string>('app.email.frontendUrl'),
      hasEmailPassword: !!this.configService.get<string>('app.email.pass'),
      timestamp: new Date().toISOString(),
    };
  }

  async refreshSession(userId: string): Promise<AuthResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateToken(user);
  }

  private async generateToken(user: User): Promise<AuthResponseDto> {
    if (!user._id) {
      throw new BadRequestException('Invalid user data for token generation');
    }

    const userId = user._id.toString();

    const payload = {
      sub: userId,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId?.toString() || null,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('app.jwt.secret'),
      expiresIn: this.configService.get<string>('app.jwt.expiresIn'),
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, tokenType: 'refresh' },
      {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn'),
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.updateRefreshToken(userId, refreshTokenHash);

    return AuthResponseDto.fromUser(user, accessToken, refreshToken);
  }

  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    let cleanedBaseUsername = baseUsername
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!cleanedBaseUsername) {
      cleanedBaseUsername = 'user';
    }

    let username = cleanedBaseUsername;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existingUser = await this.userRepository.findByUsername(username);
      if (!existingUser) {
        isUnique = true;
      } else {
        username = `${cleanedBaseUsername}${counter}`;
        counter++;
      }
    }

    return username;
  }
}
