import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, from, mergeMap, Observable, throwError } from 'rxjs';
import { removeStoredFile } from './library-storage';

type UploadRequest = {
  files?: Record<string, Express.Multer.File[] | undefined>;
};

// Va después de FileFieldsInterceptor: si la validación del DTO o el servicio
// fallan, el PDF recién escrito en disco no debe quedar huérfano.
@Injectable()
export class CleanupUploadedPdfInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<UploadRequest>();
    return next.handle().pipe(
      catchError((error: unknown) => {
        const names = (req.files?.file ?? []).map((file) => file.filename);
        return from(
          Promise.all(
            names.map((name) => removeStoredFile(name).catch(() => undefined)),
          ),
        ).pipe(mergeMap(() => throwError(() => error)));
      }),
    );
  }
}
