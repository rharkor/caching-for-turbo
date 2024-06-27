# Caching for Turborepo with GitHub Actions

[![CI Status](https://github.com/rharkor/caching-for-turbo/workflows/ci/badge.svg)](https://github.com/rharkor/caching-for-turbo/actions)

Supercharge your [Turborepo](https://turbo.build/repo/) builds with our
dedicated GitHub Actions caching service, designed to make your CI workflows
faster and more efficient.

## Quick Start

Easily integrate our caching action into your GitHub Actions workflow by adding
the following step **before** you run `turbo build`:

```yaml
- name: Cache for Turbo
  uses: rharkor/caching-for-turbo@v1.5
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
[dtinth](https://github.com/dtinth/setup-github-actions-caching-for-turbo/actions)
and has been comprehensively rewritten for enhanced robustness and reliability.
