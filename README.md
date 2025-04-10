# Caching for Turborepo with GitHub Actions

[![CI Status](https://github.com/rharkor/caching-for-turbo/workflows/ci/badge.svg)](https://github.com/rharkor/caching-for-turbo/actions)

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
  uses: rharkor/caching-for-turbo@v1.7
```

This GitHub Action facilitates:

1. **Server Initialization**: Automatically spins up a server on
   `localhost:41230`.
2. **Environment Setup**: Sets up `TURBO_API`, `TURBO_TOKEN`, and `TURBO_TEAM`
   environment variables required by `turbo build`.
3. **Efficient Caching**: Leverages GitHub's cache service to significantly
   accelerate build times.

## Configurable Options

Customize the caching behavior with the following optional settings (defaults
provided):

```yaml
with:
  cache-prefix: turbogha_ # Custom prefix for cache keys
```

## Contributing

### Set Up Your Development Environment

1. Start the development server:

   ```bash
   npm run dev-run
   ```

2. In a separate terminal, execute the tests:

   ```bash
   npm test
   ```

## Licensing

Licensed under the MIT License. For more details, see the [LICENSE](LICENSE)
file.

## Acknowledgements

This project is inspired by
[dtinth](https://github.com/dtinth/setup-github-actions-caching-for-turbo) and
has been comprehensively rewritten for enhanced robustness and reliability.
