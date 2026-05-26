import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (status === 400) {
        this.logger.warn(
          `400 Bad Request on ${request.method} ${request.url}: ${JSON.stringify(exceptionResponse)}`,
        );
      }

      if (typeof exceptionResponse === 'string') {
        // Plain string — keep as-is under message
        response.status(status).json({
          statusCode: status,
          message: exceptionResponse,
          path: request.url,
          timestamp: new Date().toISOString(),
        });
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        // Spread the full exception object so extra fields (warningType, similarPayment, etc.)
        // are available at the top level of response.data for frontend consumers.
        response.status(status).json({
          statusCode: status,
          ...exceptionResponse,
          path: request.url,
          timestamp: new Date().toISOString(),
        });
      } else {
        response.status(status).json({
          statusCode: status,
          message: 'An error occurred',
          path: request.url,
          timestamp: new Date().toISOString(),
        });
      }
      return;
    } else if (exception instanceof Error) {
      message = exception.message;
      // Log the full stack for non-HTTP errors (these are the 500s we need to debug)
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unknown exception on ${request.method} ${request.url}`,
        String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
