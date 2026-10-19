/**
 * Bundles the action entrypoints into dist/ with esbuild.
 *
 * Usage: tsx script/build.ts [--watch]
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import * as esbuild from 'esbuild'

const entries = {
  setup: 'src/index.ts',
  post: 'src/post.ts',
  cli: 'src/cli.ts'
}

// Bundled CommonJS dependencies expect require/__dirname/__filename, which
// don't exist in ESM
const banner = [
  "import { createRequire as __createRequire } from 'node:module';",
  "import { fileURLToPath as __fileURLToPath } from 'node:url';",
  "import { dirname as __pathDirname } from 'node:path';",
  'const require = __createRequire(import.meta.url);',
  'const __filename = __fileURLToPath(import.meta.url);',
  'const __dirname = __pathDirname(__filename);'
].join('\n')

// Source maps only apply to modules loaded after they are enabled, so
// index.js enables them before importing the bundle (replaces ncc's
// sourcemap-register.cjs)
const loader = [
  '#!/usr/bin/env node',
  'process.setSourceMapsEnabled(true)',
  "await import('./main.js')",
  ''
].join('\n')

const options = (name: string, entry: string): esbuild.BuildOptions => ({
  entryPoints: [entry],
  outfile: `dist/${name}/main.js`,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
  metafile: true,
  banner: { js: banner },
  logLevel: 'warning'
})

/** Walks up from a bundled file to the package.json that owns it. */
const findPackageDir = (file: string): string | undefined => {
  let dir = dirname(file)
  while (dir.includes('node_modules')) {
    const pkg = join(dir, 'package.json')
    if (existsSync(pkg) && JSON.parse(readFileSync(pkg, 'utf8')).name) {
      return dir
    }
    dir = dirname(dir)
  }
  return undefined
}

/** Writes the license of every bundled third-party package. */
const writeLicenses = async (
  outDir: string,
  metafile: esbuild.Metafile
): Promise<void> => {
  const packages = new Set<string>()
  for (const input of Object.keys(metafile.inputs)) {
    const dir = findPackageDir(input)
    if (dir) packages.add(dir)
  }

  const sections = [...packages]
    .map(dir => {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      const licenseFile = readdirSync(dir).find(f =>
        /^(licen[cs]e|copying)/i.test(f)
      )
      const text = licenseFile
        ? readFileSync(join(dir, licenseFile), 'utf8').trim()
        : ''
      return { name: pkg.name as string, license: pkg.license ?? '', text }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((s, i, all) => i === 0 || all[i - 1].name !== s.name)
    .map(s => [s.name, s.license, s.text].filter(Boolean).join('\n'))

  await writeFile(join(outDir, 'licenses.txt'), `${sections.join('\n\n')}\n`)
}

const build = async (name: string, entry: string): Promise<void> => {
  const outDir = `dist/${name}`
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })
  await writeFile(
    join(outDir, 'package.json'),
    `${JSON.stringify({ type: 'module' }, null, 2)}\n`
  )
  await writeFile(join(outDir, 'index.js'), loader, { mode: 0o755 })
  const result = await esbuild.build(options(name, entry))
  await writeLicenses(outDir, result.metafile!)
}

if (process.argv.includes('--watch')) {
  for (const [name, entry] of Object.entries(entries)) {
    const ctx = await esbuild.context(options(name, entry))
    await ctx.watch()
  }
} else {
  await Promise.all(
    Object.entries(entries).map(([name, entry]) => build(name, entry))
  )
}
