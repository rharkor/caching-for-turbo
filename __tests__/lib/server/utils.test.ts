/**
 * Tests for port-0 auto-assignment and diagnostics improvements.
 *
 * readActualPort accepts optional overrides for serverPort and serverPortFile,
 * so we can test the real export directly without module mocking.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Set CI so core.error delegates to @actions/core mock
process.env.CI = 'true'

// Import the real function — it reads module-level constants at import time,
// but we bypass them via the portOverride / portFileOverride params.
let readActualPort: typeof import('@/lib/server/utils').readActualPort
let readActualPortAsync: typeof import('@/lib/server/utils').readActualPortAsync
let parseFileSize: typeof import('@/lib/server/utils').parseFileSize

beforeEach(async () => {
  const mod = await import('@/lib/server/utils')
  readActualPort = mod.readActualPort
  readActualPortAsync = mod.readActualPortAsync
  parseFileSize = mod.parseFileSize
})

describe('readActualPort', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'turbogha-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns serverPort directly when it is not 0', () => {
    const portFile = join(tempDir, 'turbogha-port')
    expect(readActualPort(5000, 41230, portFile)).toBe(41230)
  })

  it('reads the port from the port file when serverPort is 0', () => {
    const portFile = join(tempDir, 'turbogha-port')
    writeFileSync(portFile, '54321')
    expect(readActualPort(5000, 0, portFile)).toBe(54321)
  })

  it('throws when port file does not appear within timeout', () => {
    const portFile = join(tempDir, 'turbogha-port-missing')
    expect(() => readActualPort(200, 0, portFile)).toThrow(
      /Timed out waiting for server to write its port/
    )
  })

  it('ignores port file with invalid content', () => {
    const portFile = join(tempDir, 'turbogha-port')
    writeFileSync(portFile, 'not-a-number')
    expect(() => readActualPort(200, 0, portFile)).toThrow(
      /Timed out waiting for server to write its port/
    )
  })

  it('ignores port file with zero', () => {
    const portFile = join(tempDir, 'turbogha-port')
    writeFileSync(portFile, '0')
    expect(() => readActualPort(200, 0, portFile)).toThrow(
      /Timed out waiting for server to write its port/
    )
  })

  it('handles whitespace around port number', () => {
    const portFile = join(tempDir, 'turbogha-port')
    writeFileSync(portFile, '  12345\n')
    expect(readActualPort(5000, 0, portFile)).toBe(12345)
  })
})

describe('readActualPortAsync', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'turbogha-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns serverPort directly when it is not 0', async () => {
    const portFile = join(tempDir, 'turbogha-port')
    await expect(readActualPortAsync(5000, 41230, portFile)).resolves.toBe(
      41230
    )
  })

  it('does not block the event loop while waiting for the port file', async () => {
    const portFile = join(tempDir, 'turbogha-port')
    const portPromise = readActualPortAsync(1000, 0, portFile)

    setTimeout(() => {
      writeFileSync(portFile, '54321')
    }, 0)

    await expect(portPromise).resolves.toBe(54321)
  })

  it('throws when port file does not appear within timeout', async () => {
    const portFile = join(tempDir, 'turbogha-port-missing')
    await expect(readActualPortAsync(100, 0, portFile)).rejects.toThrow(
      /Timed out waiting for server to write its port/
    )
  })
})

describe('parseFileSize', () => {
  it.each([
    ['100b', 100],
    ['10kb', 10 * 1024],
    ['5mb', 5 * 1024 * 1024],
    ['2gb', 2 * 1024 * 1024 * 1024],
    ['1tb', 1024 * 1024 * 1024 * 1024]
  ])('parses %s to %d', (input, expected) => {
    expect(parseFileSize(input)).toBe(expected)
  })

  it('is case insensitive', () => {
    expect(parseFileSize('10MB')).toBe(10 * 1024 * 1024)
  })

  it('throws on invalid format', () => {
    expect(() => parseFileSize('invalid')).toThrow('Invalid file size format')
  })

  it('throws on invalid unit', () => {
    expect(() => parseFileSize('10xx')).toThrow('Invalid file size unit')
  })
})

describe('server port-file write (integration)', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'turbogha-server-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('writeFileSync writes a valid port that readActualPort can read back', () => {
    const portFile = join(tempDir, 'turbogha-port')
    // Simulate what server/index.ts does after fastify.listen
    const actualPort = 48765
    writeFileSync(portFile, String(actualPort))
    // Read it back using the real readActualPort with port=0 so it reads the file
    expect(readActualPort(1000, 0, portFile)).toBe(48765)
  })
})
