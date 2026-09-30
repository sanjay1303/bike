export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required. Please log in.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied. You do not have permission.") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Requested record not found.") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class BikeInUseError extends AppError {
  public readonly inUse = true;
  public readonly currentRider: {
    id: string;
    name: string;
    mobile: string;
    startedAt: string | Date;
    startingKm: number;
    purpose?: string;
    isDoubleRide?: boolean;
    coRider?: { id: string; name: string; mobile: string } | null;
  };

  constructor(
    message: string,
    currentRider: {
      id: string;
      name: string;
      mobile: string;
      startedAt: string | Date;
      startingKm: number;
      purpose?: string;
      isDoubleRide?: boolean;
      coRider?: { id: string; name: string; mobile: string } | null;
    }
  ) {
    super(message, 409);
    this.currentRider = currentRider;
  }
}
