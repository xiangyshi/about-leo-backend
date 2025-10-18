import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

export interface SecurityConfig {
  apiKey?: string;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  slowDownWindowMs?: number;
  slowDownDelayAfter?: number;
  slowDownDelayMs?: number;
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.API_KEY,
      rateLimitWindowMs: config.rateLimitWindowMs || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: config.rateLimitMax || 10, // 10 requests per window
      slowDownWindowMs: config.slowDownWindowMs || 15 * 60 * 1000, // 15 minutes
      slowDownDelayAfter: config.slowDownDelayAfter || 5, // Start slowing after 5 requests
      slowDownDelayMs: config.slowDownDelayMs || 500, // 500ms delay
    };
  }

  // Rate limiting middleware
  getRateLimit() {
    return rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMax,
      message: {
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(this.config.rateLimitWindowMs! / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      validate: {
        xForwardedForHeader: false,
        forwardedHeader: false,
      },
    });
  }

  // Slow down middleware
  getSlowDown() {
    return slowDown({
      windowMs: this.config.slowDownWindowMs,
      delayAfter: this.config.slowDownDelayAfter,
      delayMs: () => this.config.slowDownDelayMs!,
      validate: {
        delayMs: false,
      },
    });
  }

  // Security headers middleware
  getSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });
  }

  // API key authentication middleware
  getApiKeyAuth() {
    return (req: any, res: any, next: any) => {
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      
      if (!this.config.apiKey) {
        console.warn('API_KEY not configured - skipping authentication');
        return next();
      }

      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          message: 'Please provide an API key in the X-API-Key header or apiKey query parameter',
        });
      }

      if (apiKey !== this.config.apiKey) {
        return res.status(403).json({
          error: 'Invalid API key',
          message: 'The provided API key is not valid',
        });
      }

      next();
    };
  }

  // Input validation middleware for chat
  getChatValidation() {
    return [
      body('message')
        .isString()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be a string between 1 and 1000 characters')
        .trim()
        .escape(),
      
      body('limit')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Limit must be an integer between 1 and 10'),
      
      body('systemPrompt')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .withMessage('System prompt must be a string with max 2000 characters')
        .trim()
        .escape(),
      
      body('history')
        .optional()
        .isArray({ max: 10 })
        .withMessage('History must be an array with max 10 items'),
      
      // Validation result handler
      (req: any, res: any, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
          });
        }
        next();
      },
    ];
  }

  // Request logging middleware
  getRequestLogger() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const clientIP = req.ip || req.connection.remoteAddress;
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${clientIP}`);
      });
      
      next();
    };
  }

  // Content length limiter
  getContentLengthLimit() {
    return (req: any, res: any, next: any) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      const maxLength = 1024 * 10; // 10KB limit
      
      if (contentLength > maxLength) {
        return res.status(413).json({
          error: 'Payload too large',
          message: 'Request body exceeds maximum allowed size',
        });
      }
      
      next();
    };
  }
}
