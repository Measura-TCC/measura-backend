import {
  PORT,
  NODE_ENV,
  JWT_SECRET,
  APP_CONSTANTS,
  ERROR_CODES,
  HTTP_STATUS_MESSAGES,
} from '../src/shared/utils/constants';

describe('Constants', () => {
  describe('Environment Variables', () => {
    beforeEach(() => {
      delete process.env.PORT;
      delete process.env.MONGODB_URI;
      delete process.env.JWT_SECRET;
    });

    it('should return default port when PORT env is not set', () => {
      expect(PORT).toBe('8080');
    });

    it('should return NODE_ENV value or default', () => {
      expect(NODE_ENV).toBeDefined();
      expect(typeof NODE_ENV).toBe('string');
    });

    it('should return default JWT_SECRET when not set', () => {
      expect(JWT_SECRET).toBe('default-secret-key-change-in-production');
    });
  });

  describe('APP_CONSTANTS', () => {
    it('should have correct pagination defaults', () => {
      expect(APP_CONSTANTS.DEFAULT_PAGE_SIZE).toBe(20);
      expect(APP_CONSTANTS.MAX_PAGE_SIZE).toBe(100);
      expect(APP_CONSTANTS.MIN_PAGE_SIZE).toBe(1);
    });

    it('should have correct password constraints', () => {
      expect(APP_CONSTANTS.MIN_PASSWORD_LENGTH).toBe(8);
      expect(APP_CONSTANTS.MAX_PASSWORD_LENGTH).toBe(128);
    });

    it('should have correct file upload constraints', () => {
      expect(APP_CONSTANTS.MAX_FILE_SIZE_MB).toBe(10);
      expect(APP_CONSTANTS.ALLOWED_FILE_TYPES).toEqual([
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'txt',
      ]);
    });

    it('should have correct cache TTL values', () => {
      expect(APP_CONSTANTS.CACHE_TTL.SHORT).toBe(300);
      expect(APP_CONSTANTS.CACHE_TTL.MEDIUM).toBe(1800);
      expect(APP_CONSTANTS.CACHE_TTL.LONG).toBe(3600);
      expect(APP_CONSTANTS.CACHE_TTL.DAILY).toBe(86400);
    });
  });

  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
    });

    it('should have authentication error codes', () => {
      expect(ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
      expect(ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
      expect(ERROR_CODES.TOKEN_INVALID).toBe('TOKEN_INVALID');
    });

    it('should have business logic error codes', () => {
      expect(ERROR_CODES.BUSINESS_RULE_VIOLATION).toBe(
        'BUSINESS_RULE_VIOLATION',
      );
      expect(ERROR_CODES.ENTITY_NOT_FOUND).toBe('ENTITY_NOT_FOUND');
      expect(ERROR_CODES.DUPLICATE_ENTITY).toBe('DUPLICATE_ENTITY');
    });
  });

  describe('HTTP_STATUS_MESSAGES', () => {
    it('should have correct success status messages', () => {
      expect(HTTP_STATUS_MESSAGES[200]).toBe('OK');
      expect(HTTP_STATUS_MESSAGES[201]).toBe('Created');
      expect(HTTP_STATUS_MESSAGES[204]).toBe('No Content');
    });

    it('should have correct error status messages', () => {
      expect(HTTP_STATUS_MESSAGES[400]).toBe('Bad Request');
      expect(HTTP_STATUS_MESSAGES[401]).toBe('Unauthorized');
      expect(HTTP_STATUS_MESSAGES[404]).toBe('Not Found');
      expect(HTTP_STATUS_MESSAGES[500]).toBe('Internal Server Error');
    });
  });
});
