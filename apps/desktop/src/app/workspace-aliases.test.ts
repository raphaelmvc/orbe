import { syncProtocolVersion } from '@orbe/contracts';
import { domainPackage } from '@orbe/domain';
import { expect, test } from 'vitest';

test('resolves runtime exports from workspace packages', () => {
  expect(domainPackage).toBe('@orbe/domain');
  expect(syncProtocolVersion).toBe(1);
});
