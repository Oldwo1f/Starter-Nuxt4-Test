import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Appeler la méthode parent mais ne pas bloquer si le token est absent
    const result = super.canActivate(context);
    
    if (result instanceof Promise) {
      return result.catch(() => true);
    }
    
    if (result instanceof Observable) {
      return result.pipe(catchError(() => of(true)));
    }
    
    return result;
  }

  handleRequest(err: any, user: any) {
    // Retourner undefined si l'utilisateur n'est pas authentifié au lieu de lancer une erreur
    if (err) {
      return undefined;
    }
    return user || undefined;
  }
}
