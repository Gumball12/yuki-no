import { formatError, log } from '../../utils/log';

import colors from 'colors/safe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.VERBOSE;
  });

  it('Should log [INFO] message when VERBOSE is true', () => {
    process.env.VERBOSE = 'true';
    log('I', 'Test message');
    expect(console.info).toHaveBeenCalledWith(
      '[INFO]',
      colors.blue('Test message'),
    );
  });

  it('Should log [SUCCESS] message when VERBOSE is true', () => {
    process.env.VERBOSE = 'true';
    log('S', 'Test message');
    expect(console.info).toHaveBeenCalledWith(
      '[SUCCESS]',
      colors.green('Test message'),
    );
  });

  it('[WARNING] logs should always be output regardless of VERBOSE setting', () => {
    delete process.env.VERBOSE;
    log('W', 'Test message');
    expect(console.warn).toHaveBeenCalledWith(
      '[WARNING]',
      colors.yellow('Test message'),
    );
  });

  it('[ERROR] logs should always be output regardless of VERBOSE setting', () => {
    delete process.env.VERBOSE;
    log('E', 'Test message');
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      colors.red('Test message'),
    );
  });

  it('Should not output [INFO] and [SUCCESS] logs when VERBOSE is false', () => {
    delete process.env.VERBOSE;
    log('I', 'Test message');
    log('S', 'Test message');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('Should process VERBOSE setting regardless of case', () => {
    process.env.VERBOSE = 'TRUE';
    log('I', 'Test message');
    expect(console.info).toHaveBeenCalled();
  });
});

describe('formatError', () => {
  it('Should format error', () => {
    const msg = 'formatted error';
    const error = new Error(msg);
    expect(formatError(error)).toBe(msg);
  });

  it('Should not format error', () => {
    const msg = { message: 'msg' };
    expect(formatError(msg)).toBe('');
  });
});
