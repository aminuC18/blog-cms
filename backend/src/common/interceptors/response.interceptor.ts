import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'meta' in data) {
          const { data: items, meta, message } = data as {
            data: unknown;
            meta: unknown;
            message?: string;
          };
          return {
            success: true,
            data: items,
            meta,
            message: message ?? 'Operation successful',
          };
        }

        return {
          success: true,
          data,
          message: 'Operation successful',
        };
      }),
    );
  }
}
