export const ErrorCodes = {
  OK: 200,
  BAD_REQUEST: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  CONFLICT: 40901,
  QUOTA_EXCEEDED: 42901,
  GLOBAL_QUOTA_EXCEEDED: 42902,
  TOO_MANY_REQUESTS: 42903,
  UPSTREAM_UNAVAILABLE: 50301,
  UPSTREAM_TIMEOUT: 50401,
  INTERNAL_ERROR: 50001,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export function mapHttpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCodes.BAD_REQUEST;
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 409:
      return ErrorCodes.CONFLICT;
    case 429:
      return ErrorCodes.TOO_MANY_REQUESTS;
    case 503:
      return ErrorCodes.UPSTREAM_UNAVAILABLE;
    case 504:
      return ErrorCodes.UPSTREAM_TIMEOUT;
    default:
      return ErrorCodes.INTERNAL_ERROR;
  }
}
