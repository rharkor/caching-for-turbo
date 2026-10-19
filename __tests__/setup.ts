import { vi } from 'vitest'

// Use the root __mocks__ for these packages, as Jest did automatically
vi.mock('@actions/core')
vi.mock('@rharkor/logger')
