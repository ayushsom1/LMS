import type { Test, TestAccessInfo } from '@/types';

export function getTestAccessStatus(
  test: Pick<Test, 'is_active' | 'starts_at' | 'ends_at'>,
  now: Date = new Date()
): TestAccessInfo {
  const starts_at = test.starts_at ?? null;
  const ends_at = test.ends_at ?? null;

  if (!test.is_active) {
    return {
      status: 'inactive',
      message: 'This test is currently inactive.',
      starts_at,
      ends_at,
    };
  }

  if (starts_at && now < new Date(starts_at)) {
    return {
      status: 'not_started',
      message: 'This test has not started yet.',
      starts_at,
      ends_at,
    };
  }

  if (ends_at && now > new Date(ends_at)) {
    return {
      status: 'ended',
      message: 'This test is closed.',
      starts_at,
      ends_at,
    };
  }

  return { status: 'open', message: 'Test is open.', starts_at, ends_at };
}
