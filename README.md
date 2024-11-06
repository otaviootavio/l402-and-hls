# HLS Proxy Project Overview

## Project Description

A SOLID-based TypeScript implementation of an HLS (HTTP Live Streaming) proxy server that handles video stream requests, caches responses, and rewrites playlist URLs. Features L402 Lightning Network payment authentication.

## Project Structure

```
src/
├── types/
│   └── index.ts           # Central type definitions and interfaces
├── config/
│   └── config.ts          # Application configuration
├── controllers/
│   └── hls-controller.ts  # HTTP request handlers
├── middleware/
│   ├── rate-limiter.ts    # Rate limiting middleware
│   └── l402.ts           # L402 payment authentication
├── services/
│   ├── cache.ts           # Caching implementation
│   ├── playlist-rewriter.ts    # M3U8 playlist URL rewriter
│   ├── content-type-resolver.ts # Content type handler
│   └── proxy-service.ts   # Core proxy logic
└── index.ts              # Application entry point
```

## Environment Variables

Create a `.env` file in the root directory:

```env
L402_SECRET=your-secret-key-here
L402_PRICE=1000
L402_TIMEOUT=3600
```

## Component Roles

### 1. Types (types/index.ts)

Contains all TypeScript interfaces and types used throughout the application:

- `ProxyConfig`: Configuration interface
- `CacheEntry`: Cache data structure
- `ICache`: Cache service interface
- `IPlaylistRewriter`: Playlist rewriting interface
- `IContentTypeResolver`: Content type handling interface
- `IProxyService`: Main proxy service interface
- `ProxyResponse`: Response data structure

### 2. Config (config/config.ts)

Centralizes application configuration:

- Stream base URL
- Server port
- Cache durations for manifests and segments

### 3. Controllers (controllers/hls-controller.ts)

Handles HTTP requests:

- `handleHLSRequest`: Processes HLS stream requests
- `handleHealthCheck`: Server health endpoint
- Routes requests to appropriate services

### 4. Middleware

Contains Express middleware:

#### Rate Limiter (middleware/rate-limiter.ts)

- Rate limiting configuration
- Request throttling implementation

#### L402 Middleware (middleware/l402.ts)

- Lightning Network payment authentication
- Token validation and verification
- Macaroon handling

## 5. Services

Core business logic implementations:

#### Cache Service (services/cache.ts)

- In-memory caching implementation
- Cache entry management
- Automatic cache cleaning

#### Playlist Rewriter (services/playlist-rewriter.ts)

- M3U8 playlist parsing
- URL rewriting for proxy paths
- Manifest file handling

#### Content Type Resolver (services/content-type-resolver.ts)

- File type detection
- MIME type resolution
- Content-Type header management

#### Proxy Service (services/proxy-service.ts)

- Main proxy logic
- Request handling
- Response processing
- Error management

### 6. Entry Point (index.ts)

Application bootstrap:

- Dependency initialization
- Middleware setup
- Route configuration
- Server startup

## Key Features

1. SOLID Principles Implementation
2. Dependency Injection
3. Interface-based Design
4. Modular Architecture
5. Clear Separation of Concerns

## Key Features

1. SOLID Principles Implementation
2. Dependency Injection
3. Interface-based Design
4. Modular Architecture
5. Clear Separation of Concerns
6. L402 Payment Authentication

## How Components Interact

1. Request Flow:

```
Client Request
     ↓
Rate Limiter
     ↓
L402 Authentication
     ↓
HLS Controller
     ↓
Proxy Service
     ↓
Cache Check → Cache Service
     ↓
URL Rewriting → Playlist Rewriter
     ↓
Content Type → Content Type Resolver
     ↓
Response to Client
```

2. L402 Authentication Flow:

```
Request with no token
     ↓
Generate Challenge
     ↓
Return 402 with WWW-Authenticate header
     ↓
Client makes payment and gets preimage
     ↓
Request with L402 token
     ↓
Verify macaroon and preimage
     ↓
Allow access to protected content
```

3. Service Dependencies:

```
HLS Controller
    ↓
Proxy Service
    ↓
├── Cache Service
├── Playlist Rewriter
└── Content Type Resolver

L402 Middleware
    ↓
Token Verification
```

## Environment Setup

1. Install dependencies:

```bash
npm install dotenv
```

2. Create environment files:

- `.env`: Contains actual configuration values
- `.env.example`: Template for required environment variables
- Add `.env` to `.gitignore`

3. Required environment variables:

- `L402_SECRET`: Secret key for macaroon signing
- `L402_PRICE`: Price in satoshis for content access
- `L402_TIMEOUT`: Token validity period in seconds

## Security Considerations

1. L402 Implementation:

   - Secure macaroon handling
   - Cryptographic verification of payments
   - Token expiration management
   - Protection against replay attacks

2. Environment Variables:
   - Secure secret key management
   - Environment-specific configurations
   - Production security best practices
