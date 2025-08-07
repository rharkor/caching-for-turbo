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

## Comparison with Other Approaches

### GitHub Actions Built-in Cache

Turborepo's
[official documentation](https://turborepo.com/docs/guides/ci-vendors/github-actions#remote-caching-with-github-actionscache)
also mentions using GitHub Actions' built-in cache directly. Here's how our
approach compares:

**GitHub Actions Built-in Cache Approach**

- Uses `actions/cache` action directly with Turborepo's cache outputs
- Simpler setup with fewer moving parts
- Limited to GitHub's cache storage only

**This Action's Approach**

- Provides a modular caching solution with multiple storage backends
- Supports both GitHub Actions cache and S3 storage
- Offers more control over cache retention and cleanup policies
- Enables local development with the same caching infrastructure

### When to Choose Each Approach

**Choose GitHub Actions Built-in Cache when:**

- You want the simplest possible setup
- You're only using GitHub Actions for CI
- You don't need advanced cache management features
- You're satisfied with GitHub's cache storage limitations

**Choose This Action when:**

- You need more granular cache control
- You want to use S3 or other storage backends
- You need advanced cleanup and retention policies
- You want to use the same caching infrastructure locally and in CI
- You have a large monorepo where modular caching provides benefits

Both approaches are valid and serve different use cases. The built-in cache
approach is simpler and has been available for a long time, while this action
provides more flexibility and features.

## Quick Start

Easily integrate our caching action into your GitHub Actions workflow by adding
the following step **before** you run `turbo build`:

```yaml
- name: Cache for Turbo
  uses: rharkor/caching-for-turbo@v2.2.1
```

This GitHub Action facilitates:

1. **Server Initialization**: Automatically spins up a server on
   `localhost:41230` (configurable via `server-port`).
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
turbogha start

# Or run the server in foreground mode
turbogha start --foreground
```

To stop the server, you can use the following command:

```bash
turbogha kill
```

To ping the server, you can use the following command:

```bash
turbogha ping
```

### Environment Configuration

Create a `.env` file in your project root to configure the cache server:

```env
# Cache provider (github or s3)
PROVIDER=s3

# S3 Configuration (required when using s3 provider)
AWS_ACCESS_KEY_ID=secret # Or S3_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=secret # Or S3_SECRET_ACCESS_KEY
AWS_REGION=us-east-1 # Or AWS_DEFAULT_REGION or S3_REGION
AWS_ENDPOINT_URL_S3=https://s3.amazonaws.com # Or AWS_ENDPOINT_URL or S3_ENDPOINT
S3_BUCKET=my-bucket
S3_PREFIX=turbogha/

# Optional: Custom cache prefix
CACHE_PREFIX=turbogha_

# Optional: Custom server port (default: 41230)
SERVER_PORT=41230
```

### Using with Turbo

Once the server is running, you can use Turbo with remote caching:

```bash
# If using default port (41230)
export TURBO_API=http://localhost:41230
export TURBO_TOKEN=turbogha
export TURBO_TEAM=turbogha

# If using custom port (set via SERVER_PORT env var)
export TURBO_API=http://localhost:${SERVER_PORT:-41230}
export TURBO_TOKEN=turbogha
export TURBO_TEAM=turbogha

# Now run your turbo commands
turbo build
```

_See: https://turborepo.com/docs/reference/system-environment-variables_

### Stopping the Server

To stop the cache server:

```bash
turbogha kill
# or (use your custom port if configured)
curl -X DELETE http://localhost:${SERVER_PORT:-41230}/shutdown
```

## Configurable Options

Customize the caching behavior with the following optional settings (defaults
provided):

```yaml
with:
  cache-prefix: turbogha_ # Custom prefix for cache keys
  provider: github # Storage provider: 'github' (default) or 's3'
  server-port: 41230 # Port for the caching server (default: 41230)

  # S3 Provider Configuration (variables will be read from environment variables if not provided)
  s3-access-key-id: ${{ secrets.S3_ACCESS_KEY_ID }} # S3 access key
  s3-secret-access-key: ${{ secrets.S3_SECRET_ACCESS_KEY }} # S3 secret key
  s3-session-token: ${{ secrets.S3_SESSION_TOKEN }} # Optional S3 session token, for temporary credentials (e.g. OIDC)
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
  uses: rharkor/caching-for-turbo@v2.2.1
  with:
    provider: s3
    s3-bucket: my-turbo-cache-bucket
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
  uses: rharkor/caching-for-turbo@v2.2.1
  with:
    provider: s3
    s3-bucket: my-turbo-cache-bucket
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
