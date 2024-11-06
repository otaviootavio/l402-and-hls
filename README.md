# HLS Proxy Project Overview

## Project Description

A SOLID-based TypeScript implementation of an HLS (HTTP Live Streaming) proxy server that handles video stream requests, caches responses, and rewrites playlist URLs. Features L402 Lightning Network payment authentication.

## Project Structure

```
src/
├── types/
│   ├── index.ts           # Type exports barrel file
│   ├── config.ts          # Configuration interfaces
│   ├── token.ts           # Token related interfaces
│   ├── storage.ts         # Storage interfaces
│   └── logger.ts          # Logger interfaces
├── config/
│   └── config.ts          # Application configuration
├── controllers/
│   └── hls-controller.ts  # HTTP request handlers
├── middleware/
│   ├── rate-limiter.ts    # Rate limiting middleware
│   └── l402.ts           # L402 payment authentication
├── services/
│   ├── cache.ts          # Caching implementation
│   ├── playlist-rewriter.ts    # M3U8 playlist URL rewriter
│   ├── content-type-resolver.ts # Content type handler
│   ├── lightning.ts      # Lightning Network service
│   ├── retry.ts         # Retry operation service
│   ├── macaroon.ts      # Macaroon handling service
│   └── proxy-service.ts  # Core proxy logic
├── storage/
│   ├── index.ts         # Storage exports
│   └── memory.ts        # Memory storage implementation
├── logger/
│   ├── index.ts         # Logger exports
│   └── console.ts       # Console logger implementation
├── errors/
│   └── L402Error.ts     # Error definitions
├── constants/
│   └── index.ts         # Constants definition
└── index.ts            # Application entry point
```

## Environment Variables

Create a `.env` file in the root directory:

```env
L402_SECRET=your-secret-key-here
L402_PRICE=1000
L402_TIMEOUT=10
LND_SOCKET=127.0.0.1:10009
LND_MACAROON=your-macaroon-here
LND_CERT=your-cert-here
```

## Component Roles

### 1. Types
- Separated into domain-specific interfaces
- Central type definitions for each component
- Type exports through barrel files

### 2. Services
Core business logic implementations now include:
- Lightning Network service
- Retry operation handling
- Macaroon token management
- Original proxy and cache services

### 3. Storage
- Interface-based storage abstraction
- Memory storage implementation
- Metrics and cleanup capabilities

### 4. Logger
- Structured logging interface
- Console logger implementation
- Log level management

[Rest of the README remains the same...]

## Additional Features

1. Structured Logging
2. Storage Metrics
3. Health Checking
4. Retry Mechanisms
5. Error Handling
6. Token Management
7. Header Sanitization

## Service Dependencies

```
L402 Middleware
    ↓
├── Lightning Service
├── Retry Service
├── Macaroon Service
├── Storage Service
└── Logger Service
```

## Required environment variables:

- `L402_SECRET`: Secret key for macaroon signing
- `L402_PRICE`: Price in satoshis for content access
- `L402_TIMEOUT`: Token validity period in seconds
- `LND_SOCKET`: LND node socket address
- `LND_MACAROON`: Base64 encoded macaroon
- `LND_CERT`: Base64 encoded TLS certificate