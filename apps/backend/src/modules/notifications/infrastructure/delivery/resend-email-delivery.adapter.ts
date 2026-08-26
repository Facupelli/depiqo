import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { Env } from 'src/config/env.schema';

import {
  EmailDeliveryFailure,
  EmailDeliveryPort,
  EmailDeliveryResult,
  EmailMessage,
  EmailRecipient,
} from '../../application/ports/email-delivery.port';

@Injectable()
export class ResendEmailDeliveryAdapter implements EmailDeliveryPort {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const validationFailure = this.validateMessage(message);
    if (validationFailure) {
      return validationFailure;
    }

    try {
      const response = await this.resend.emails.send(
        {
          from: this.formatSender(message.sender.fromEmail, message.sender.fromName),
          to: message.recipients.map((recipient) => this.formatRecipient(recipient)),
          replyTo: message.sender.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text,
          tags: this.toResendTags(message.metadata),
        },
        message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
      );

      if (response.error) {
        return this.providerFailure(response.error.message ?? 'Failed to send email via Resend.');
      }

      return {
        success: true,
        provider: 'RESEND',
        providerMessageId: response.data?.id,
      };
    } catch (error) {
      if (error instanceof Error) {
        return this.providerFailure(error.message);
      }

      return this.providerFailure('Failed to send email via Resend.');
    }
  }

  private validateMessage(message: EmailMessage): EmailDeliveryFailure | null {
    if (message.recipients.length === 0) {
      return this.invalidMessage('Email message must include at least one recipient.');
    }

    if (message.recipients.some((recipient) => recipient.email.trim().length === 0)) {
      return this.invalidMessage('Email message recipients must include a valid email address.');
    }

    if (message.sender.fromEmail.trim().length === 0) {
      return this.invalidMessage('Email message sender must include a from email address.');
    }

    if (message.subject.trim().length === 0) {
      return this.invalidMessage('Email message must include a subject.');
    }

    if (message.html.trim().length === 0 && message.text.trim().length === 0) {
      return this.invalidMessage('Email message must include html or text content.');
    }

    return null;
  }

  private formatSender(fromEmail: string, fromName?: string): string {
    if (!fromName) {
      return fromEmail;
    }

    return `${fromName} <${fromEmail}>`;
  }

  private formatRecipient(recipient: EmailRecipient): string {
    if (!recipient.name) {
      return recipient.email;
    }

    return `${recipient.name} <${recipient.email}>`;
  }

  private toResendTags(metadata?: Record<string, string>): Array<{ name: string; value: string }> | undefined {
    if (!metadata) {
      return undefined;
    }

    const tags = Object.entries(metadata).map(([name, value]) => ({ name, value }));

    return tags.length > 0 ? tags : undefined;
  }

  private invalidMessage(message: string): EmailDeliveryFailure {
    return {
      success: false,
      provider: 'RESEND',
      reason: 'INVALID_MESSAGE',
      message,
    };
  }

  private providerFailure(message: string): EmailDeliveryFailure {
    return {
      success: false,
      provider: 'RESEND',
      reason: 'PROVIDER_ERROR',
      message,
    };
  }
}
