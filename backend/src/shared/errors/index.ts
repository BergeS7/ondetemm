export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Registro não encontrado') {
    super(404, 'NOT_FOUND', message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso não permitido') {
    super(403, 'FORBIDDEN', message);
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos') {
    super(400, 'VALIDATION_ERROR', message);
  }
}
export class ConflictError extends AppError {
  constructor(message = 'Registro em conflito') {
    super(409, 'CONFLICT', message);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Autenticação necessária') {
    super(401, 'UNAUTHORIZED', message);
  }
}
