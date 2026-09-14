import { describe, expect, it } from 'vitest';
import { ensureNoDuplicateCodes, validateDailyHours } from '../src/services/timeValidation.js';

describe('time entry validation', () => {
  it('rejects hours greater than max', () => {
    expect(() => validateDailyHours(25, 24)).toThrow(/Maximum daily hours exceeded/);
  });

  it('accepts valid hours', () => {
    expect(() => validateDailyHours(8, 24)).not.toThrow();
  });

  it('rejects duplicate charge codes in same day', () => {
    expect(() => ensureNoDuplicateCodes(['a', 'a'])).toThrow(/Duplicate charge code splits/);
  });

  it('accepts unique charge codes', () => {
    expect(() => ensureNoDuplicateCodes(['a', 'b'])).not.toThrow();
  });
});
