import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { CustomerGoogleFinalizeController } from './features/customer-google-finalize/customer-google-finalize.controller';
import { CustomerGoogleLoginController } from './features/customer-google-login/customer-google-login.controller';
import { CustomerGoogleLoginService } from './features/customer-google-login/customer-google-login.service';
import { CustomerGoogleStateController } from './features/customer-google-state/customer-google-state.controller';
import { CustomerLoginController } from './features/customer-login/customer-login.controller';
import { CustomerLocalAuthGuard } from './features/customer-login/customer-local-auth.guard';
import { CustomerLocalStrategy } from './features/customer-login/customer-local.strategy';
import { GetCsrfTokenController } from './features/get-csrf-token/get-csrf-token.controller';
import { GetCurrentUserController } from './features/get-current-user/get-current-user.controller';
import { LocalAuthGuard } from './features/login/local-auth.guard';
import { LocalStrategy } from './features/login/local.strategy';
import { LoginController } from './features/login/login.controller';
import { LogoutController } from './features/logout/logout.controller';
import { ValidateCustomerLocalCredentialsService } from './features/validate-customer-local-credentials/validate-customer-local-credentials.service';
import { ValidateLocalCredentialsService } from './features/validate-local-credentials/validate-local-credentials.service';
import { AuthAuditService } from './shared/audit/auth-audit.service';
import { CsrfGuard } from './shared/csrf/csrf.guard';
import { CsrfService } from './shared/csrf/csrf.service';
import { GoogleAuthStateService } from './shared/google/google-auth-state.service';
import { GoogleIdentityVerificationService } from './shared/google/google-identity-verification.service';
import { CustomerGoogleHandoffTicketService } from './shared/handoff/customer-google-handoff-ticket.service';
import { PasswordService } from './shared/password/password.service';
import { AuthSessionSerializer } from './shared/session/auth-session.serializer';
import { SessionAuthGuard } from './shared/session/session-auth.guard';
import { AuthActorAccessGuard } from './shared/session/auth-actor-access.guard';
import { SessionRegeneratorService } from './shared/session/session-regenerator.service';
import { TenantCustomerSessionGuard } from './shared/session/tenant-customer-session.guard';
import { TenantUserSessionGuard } from './shared/session/tenant-user-session.guard';

@Module({
  imports: [
    PassportModule.register({
      session: true,
    }),
    JwtModule.register({}),
  ],
  controllers: [
    CustomerGoogleFinalizeController,
    CustomerGoogleLoginController,
    CustomerGoogleStateController,
    CustomerLoginController,
    GetCsrfTokenController,
    GetCurrentUserController,
    LoginController,
    LogoutController,
  ],
  providers: [
    ValidateLocalCredentialsService,
    ValidateCustomerLocalCredentialsService,
    CustomerGoogleLoginService,
    CustomerGoogleHandoffTicketService,
    GoogleAuthStateService,
    GoogleIdentityVerificationService,
    PasswordService,
    AuthAuditService,
    CsrfService,
    LocalStrategy,
    LocalAuthGuard,
    CustomerLocalStrategy,
    CustomerLocalAuthGuard,
    SessionAuthGuard,
    TenantUserSessionGuard,
    TenantCustomerSessionGuard,
    AuthSessionSerializer,
    SessionRegeneratorService,
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthActorAccessGuard,
    },
  ],
  exports: [PasswordService],
})
export class AuthModule {}
