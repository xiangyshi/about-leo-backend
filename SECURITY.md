# Security Features Documentation

## Overview
Your chat API now has comprehensive protection against abuse with multiple layers of security.

## Security Layers Implemented

### 1. **Rate Limiting**
- **Limit**: 10 requests per 15 minutes per IP
- **Purpose**: Prevents spam and DoS attacks
- **Response**: Returns 429 status with retry-after header

### 2. **API Key Authentication**
- **Required**: X-API-Key header or apiKey query parameter
- **Purpose**: Controls access to the chat endpoint
- **Response**: 401 for missing key, 403 for invalid key

### 3. **Input Validation & Sanitization**
- **Message**: 1-1000 characters, HTML escaped
- **Limit**: 1-10 integer
- **System Prompt**: Max 2000 characters, HTML escaped
- **History**: Max 10 items array
- **Purpose**: Prevents injection attacks and malformed requests

### 4. **Request Size Limiting**
- **Max Size**: 10KB per request
- **Purpose**: Prevents large payload attacks
- **Response**: 413 Payload Too Large

### 5. **Slow Down Protection**
- **Trigger**: After 5 requests in 15 minutes
- **Delay**: 500ms additional delay per request
- **Purpose**: Gradual throttling before hard rate limit

### 6. **Security Headers**
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **Purpose**: Browser security and XSS protection

### 7. **Request Logging**
- **Logs**: Timestamp, method, path, status, duration, IP
- **Purpose**: Monitoring and abuse detection

## Environment Variables Required

Add these to your Vercel environment variables:

```bash
# Required for API authentication
API_KEY=your-secure-api-key-here

# Existing variables
DATABASE_URL=your-postgresql-connection-string
OPENAI_API_KEY=your-openai-api-key
```

## Usage Examples

### ✅ Valid Request
```bash
curl -X POST https://your-api.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-api-key-here" \
  -d '{"message": "What projects has Leo worked on?"}'
```

### ❌ Missing API Key
```bash
curl -X POST https://your-api.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
# Returns: 401 Unauthorized
```

### ❌ Rate Limited
```bash
# After 10 requests in 15 minutes
curl -X POST https://your-api.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-api-key-here" \
  -d '{"message": "Hello"}'
# Returns: 429 Too Many Requests
```

## Configuration Options

You can customize the security settings by modifying the `SecurityMiddleware` constructor:

```typescript
const security = new SecurityMiddleware({
  apiKey: 'custom-key',
  rateLimitWindowMs: 10 * 60 * 1000, // 10 minutes
  rateLimitMax: 20, // 20 requests per window
  slowDownDelayAfter: 10, // Start slowing after 10 requests
  slowDownDelayMs: 1000, // 1 second delay
});
```

## Monitoring

Check your Vercel function logs to monitor:
- Request patterns
- Rate limit hits
- Invalid API key attempts
- Response times

## Security Best Practices

1. **Generate a strong API key**: Use a random string generator
2. **Rotate API keys regularly**: Change them periodically
3. **Monitor logs**: Watch for suspicious patterns
4. **Use HTTPS**: Always use secure connections
5. **Keep dependencies updated**: Regular security updates

## Testing Security

Test your security measures:

```bash
# Test rate limiting
for i in {1..15}; do
  curl -X POST https://your-api.vercel.app/api/chat \
    -H "Content-Type: application/json" \
    -H "X-API-Key: your-key" \
    -d '{"message": "test"}'
done

# Test input validation
curl -X POST https://your-api.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"message": "'$(printf 'A%.0s' {1..1001})'"}'
# Should return validation error
```

Your chat API is now well-protected against common abuse patterns!
