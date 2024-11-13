export class L402Error extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly statusCode: number,
      public readonly details?: unknown,
      public readonly isOperational: boolean = true
    ) {
      super(message);
      this.name = 'L402Error';
      Error.captureStackTrace(this, this.constructor);
    }
  }
  