# Caching for Turborepo

[![typescript-action status](https://github.com/rharkor/caching-for-turbo/workflows/ci/badge.svg)](https://github.com/rharkor/caching-for-turbo/actions)

Caching for [Turborepo](https://turbo.build/repo/), using GitHub Actions’ cache
service.

## How to use

Add this to your GitHub Actions workflow, **before** running `turbo build`.

<!-- prettier-ignore -->
```yaml
      - name: Cache for Turbo
        uses: rharkor/caching-for-turbo@v1
```

The action will:

1. Launch a server on `localhost:41230` (and waits for it to be ready).

2. Exports the `TURBO_API`, `TURBO_TOKEN` and `TURBO_TEAM` environment variables
   for use by `turbo build`.

3. Sets up a post-build step to print the server logs (for debugging).

## Configuration

Configuration is optional. Here are the available options and their default
values:

<!-- prettier-ignore -->
```yaml
        with:
          # Set the prefix for the cache keys.
          cache-prefix: turbogha_
```

## Development

To run the tests:

Start a server in a separate terminal:

```bash
npm run dev-run
```

Run the tests:

```bash
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE)
file.

The code was inspired by
[dtinth](https://github.com/dtinth/setup-github-actions-caching-for-turbo/actions)
but was entirely rewritten to be more robust.
