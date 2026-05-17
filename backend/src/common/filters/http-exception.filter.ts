import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import {
  defaultMessageForStatus,
  humanizeFieldName,
  humanizeKnownMessage,
  humanizeValidationMessage,
} from '../utils/user-error.util';

interface FieldError {
  field: string;
  message: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const payload =
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : (exceptionResponse as Record<string, unknown>);

      const errors = this.normalizeErrors(payload.errors, payload.message);
      const message = this.resolveMessage(status, payload.message, errors);

      response.status(status).json({
        success: false,
        statusCode: status,
        message,
        errors: errors.length ? errors : undefined,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: defaultMessageForStatus(HttpStatus.INTERNAL_SERVER_ERROR),
    });
  }

  private resolveMessage(
    status: number,
    rawMessage: unknown,
    errors: FieldError[],
  ) {
    if (errors.length) {
      if (errors.length === 1) {
        return errors[0].message;
      }
      return 'Please fix the highlighted fields and try again.';
    }

    if (Array.isArray(rawMessage)) {
      const messages = rawMessage
        .filter((item): item is string => typeof item === 'string')
        .map((item) => humanizeKnownMessage(item));
      if (messages.length === 1) {
        return messages[0];
      }
      if (messages.length > 1) {
        return 'Please fix the highlighted fields and try again.';
      }
    }

    if (typeof rawMessage === 'string' && rawMessage.trim()) {
      return humanizeKnownMessage(rawMessage);
    }

    return defaultMessageForStatus(status);
  }

  private normalizeErrors(rawErrors: unknown, rawMessage: unknown): FieldError[] {
    if (Array.isArray(rawErrors)) {
      return rawErrors
        .map((error) => this.normalizeFieldError(error))
        .filter((error): error is FieldError => Boolean(error));
    }

    if (Array.isArray(rawMessage)) {
      return rawMessage
        .filter((item): item is string => typeof item === 'string')
        .map((item, index) => ({
          field: `field${index + 1}`,
          message: humanizeKnownMessage(item),
        }));
    }

    return [];
  }

  private normalizeFieldError(error: unknown): FieldError | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const candidate = error as {
      field?: string;
      property?: string;
      message?: string;
      constraints?: Record<string, string>;
      children?: ValidationError[];
    };

    if (typeof candidate.message === 'string' && candidate.field) {
      return {
        field: candidate.field,
        message: humanizeKnownMessage(candidate.message),
      };
    }

    const field = candidate.field ?? candidate.property;
    const constraints = candidate.constraints;
    if (field && constraints) {
      const [constraintMessage] = Object.values(constraints);
      if (constraintMessage) {
        return {
          field,
          message: `${humanizeFieldName(field)}: ${humanizeValidationMessage(constraintMessage, field)}`,
        };
      }
    }

    if (candidate.children?.length) {
      const child = candidate.children
        .map((item) => this.normalizeFieldError(item))
        .find(Boolean);
      if (child) {
        return child;
      }
    }

    return null;
  }
}
