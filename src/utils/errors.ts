export class ApplicationError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype); // Support correct instanceof chain in CJS/ES5
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class FirestoreError extends ApplicationError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'FIRESTORE_ERROR');
  }
}

export class DriveApiError extends ApplicationError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'DRIVE_API_ERROR');
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string) {
    super(message, 503, 'NETWORK_ERROR');
  }
}
