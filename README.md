# HLS Proxy Project Overview

## Project Description

A SOLID-based TypeScript implementation of an HLS (HTTP Live Streaming) proxy server that handles video stream requests, caches responses, and rewrites playlist URLs.

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
│   └── rate-limiter.ts    # Rate limiting middleware
├── services/
│   ├── cache.ts           # Caching implementation
│   ├── playlist-rewriter.ts    # M3U8 playlist URL rewriter
│   ├── content-type-resolver.ts # Content type handler
│   └── proxy-service.ts   # Core proxy logic
└── index.ts              # Application entry point
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

### 4. Middleware (middleware/rate-limiter.ts)

Contains Express middleware:

- Rate limiting configuration
- Request throttling implementation

### 5. Services

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

## How Components Interact

1. Request Flow:

```
Client Request
     ↓
Rate Limiter
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

2. Service Dependencies:

```
HLS Controller
    ↓
Proxy Service
    ↓
├── Cache Service
├── Playlist Rewriter
└── Content Type Resolver
```
