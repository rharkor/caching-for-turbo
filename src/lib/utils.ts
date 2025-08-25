import { getTracker } from './tracker'

export const timingProvider = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<any>
>(
  name: keyof ReturnType<typeof getTracker>,
  tracker: ReturnType<typeof getTracker>,
  fn: F
) => {
  return async (...args: Parameters<F>) => {
    const start = performance.now()
    const result = await fn(...args)
    const end = performance.now()
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`${name} took ${end - start}ms`)
    }
    tracker[name] += end - start
    return result
  }
}
