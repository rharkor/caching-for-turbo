# Caching for Turborepo with GitHub Actions

[![CI Status](https://github.com/rharkor/caching-for-turbo/workflows/Test%20core%20functionality/badge.svg)](https://github.com/rharkor/caching-for-turbo/actions)

Supercharge your [Turborepo](https://turbo.build/repo/) builds with our
dedicated GitHub Actions caching service, designed to make your CI workflows
faster and more efficient.

## Why This Project?

This GitHub Action provides an alternative approach to Turborepo vercel remote
caching in CI/CD pipelines. While Vercel's official solution works well, there
are some key advantages to using this action:

### 1. Independent from Vercel

- No need for Vercel account or tokens
- Works entirely within GitHub's ecosystem
- Reduces external service dependencies
- Free forever

### 2. Granular Caching

The main technical difference lies in how caching is handled:

**Vercel's Approach**

- Uses a remote caching server hosted by Vercel
- Become expensive for large monorepos with multiple apps/packages
- May have limitations based on your Vercel plan

**This Action's Approach**

- Simulates a local remote caching server on `localhost:41230`
- Uses GitHub Actions' built-in caching system
- Github will automatically remove old cache entries

### 3. When to Use This?

This solution might be better when:

- You have a large monorepo with multiple apps/packages
- You want to avoid external service dependencies
- You need more control over your caching strategy
- You want to leverage GitHub's existing infrastructure

However, if you're already using Vercel and their remote caching works well for
your needs, there's no pressing need to switch. Both solutions are valid
approaches to the same problem.

## Quick Start

Easily integrate our caching action into your GitHub Actions workflow by adding
the following step **before** you run `turbo build`:

```yaml
- name: Cache for Turbo
  uses: rharkor/caching-for-turbo@v2.1.0
```

This GitHub Action facilitates:

1. **Server Initialization**: Automatically spins up a server on
   `localhost:41230`.
2. **Environment Setup**: Sets up `TURBO_API`, `TURBO_TOKEN`, and `TURBO_TEAM`
   environment variables required by `turbo build`.
3. **Efficient Caching**: Leverages GitHub's cache service to significantly
   accelerate build times.

## Local Development

You can also use this package as a global dependency to run the cache server
locally during development. This allows you to use the same caching
infrastructure (including S3) that you use in CI.

### Installation

Add this package as a global dependency:

```bash
npm install -g @rharkor/caching-for-turbo
```

### Usage

The package provides a `turbogha` binary that you can use to start the cache
server:

```bash
# Start the server in background mode (recommended for development)
turbogha

# Or run the server in foreground mode
turbogha --server
```

To stop the server, you can use the following command:

```bash
turbogha --kill
```

To ping the server, you can use the following command:

```bash
turbogha --ping
```

### Environment Configuration

Create a `.env` file in your project root to configure the cache server:

```env
# Cache provider (github or s3)
PROVIDER=s3

# S3 Configuration (required when using s3 provider)
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_PREFIX=turbogha/

# Optional: Custom cache prefix
CACHE_PREFIX=turbogha_
```

### Using with Turbo

Once the server is running, you can use Turbo with remote caching:

```bash
export TURBOGHA_PORT=41230
export TURBO_API=http://localhost:41230
export TURBO_TOKEN=turbogha
export TURBO_TEAM=turbogha

# Now run your turbo commands
turbo build
```

_See: https://turborepo.com/docs/reference/system-environment-variables_

### Stopping the Server

To stop the cache server:

```bash
turbogha --kill
# or
curl -X DELETE http://localhost:41230/shutdown
```

## Configurable Options

Customize the caching behavior with the following optional settings (defaults
provided):

```yaml
with:
  cache-prefix: turbogha_ # Custom prefix for cache keys
  provider: github # Storage provider: 'github' (default) or 's3'

  # S3 Provider Configuration (required when provider is set to 's3')
  s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }} # S3 access key
  s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }} # S3 secret key
  s3-bucket: your-bucket-name # S3 bucket name
  s3-region: us-east-1 # S3 bucket region
  s3-endpoint: https://s3.amazonaws.com # S3 endpoint
  s3-prefix: turbogha/ # Optional prefix for S3 objects (default: 'turbogha/')
```

### Storage Providers

#### GitHub Cache (Default)

By default, this action uses GitHub's built-in cache service, which offers:

- Seamless integration with GitHub Actions
- No additional setup required
- Automatic cache pruning by GitHub

#### S3 Storage

For teams requiring more control over caching infrastructure, the action
supports Amazon S3 or compatible storage:

- Store cache artifacts in your own S3 bucket
- Works with any S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces,
  etc.)
- Greater control over retention policies and storage costs
- Useful for larger organizations with existing S3 infrastructure

It is very important to note that by default the cached files are stored
forever. It is recommended to set a max-size (or other cleanup options) to avoid
unexpected costs.

Example S3 configuration:

```yaml
- name: Cache for Turbo
  uses: rharkor/caching-for-turbo@v2.1.0
  with:
    provider: s3
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    s3-bucket: my-turbo-cache-bucket
    s3-region: us-west-2
    s3-endpoint: https://s3.amazonaws.com
```

### Cache Cleanup Options

To prevent unbounded growth of your cache (especially important when using S3
storage), you can configure automatic cleanup using one or more of these
options:

```yaml
with:
  # Cleanup by age - remove cache entries older than the specified duration
  max-age: 1mo # e.g., 1d (1 day), 1w (1 week), 1mo (1 month)

  # Cleanup by count - keep only the specified number of most recent cache entries
  max-files: 300 # e.g., limit to 300 files

  # Cleanup by size - remove oldest entries when total size exceeds the limit
  max-size: 10gb # e.g., 100mb, 5gb, 10gb
```

When using the GitHub provider, the built-in cache has its own pruning
mechanism, but these options can still be useful for more precise control.

For S3 storage, implementing these cleanup options is **highly recommended** to
control storage costs, as S3 does not automatically remove old cache entries.

Example with cleanup configuration:

```yaml
- name: Cache for Turbo
  uses: rharkor/caching-for-turbo@v2.1.0
  with:
    provider: s3
    s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }}
    s3-bucket: my-turbo-cache-bucket
    s3-region: us-west-2
    s3-endpoint: https://s3.amazonaws.com
    # Cleanup configuration
    max-age: 2w
    max-size: 5gb
```

## Contributing

### Set Up Your Development Environment

1. Start the development server:

   ```bash
   npm run dev-run
   ```

2. In a separate terminal, execute the tests:

   ```bash
   npm test -- --cache=remote:rw --no-daemon
   ```

#### Testing the cleanup script

```bash
npm run cleanup
```

## Licensing

Licensed under the MIT License. For more details, see the [LICENSE](LICENSE)
file.

## Acknowledgements

This project is inspired by
[dtinth](https://github.com/dtinth/setup-github-actions-caching-for-turbo) and
has been comprehensively rewritten for enhanced robustness and reliability.

