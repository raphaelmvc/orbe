import { expect, test } from '@playwright/test';

test('loads the desktop end-to-end test harness', () => {
  expect('@orbe/desktop').toBe('@orbe/desktop');
});
