import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const messageFromException =
      typeof raw === 'object' && raw !== null && 'message' in raw
        ? (raw as { message: unknown }).message
        : (raw ?? 'Erro interno do servidor');

    const requestId = request.id;

    // Erros 5xx (inesperados): loga stack completo no servidor, mas nunca vaza pro cliente.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} [req:${requestId ?? '-'}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'ERROR',
      // 5xx mostra mensagem genérica; demais erros expõem a mensagem real (validação etc.)
      message: status >= 500 ? 'Erro interno do servidor' : messageFromException,
      requestId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
