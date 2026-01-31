import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UploadService } from '../upload.service';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  constructor(private uploadService: UploadService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (file) {
      try {
        this.uploadService.validateFile(file);
      } catch (error) {
        throw new BadRequestException(error.message);
      }
    }

    return next.handle();
  }
}
