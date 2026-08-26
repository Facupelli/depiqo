import { createBarrier, runConcurrently } from './concurrency';

describe('createBarrier', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not release a participant before every configured participant arrives', async () => {
    const barrier = createBarrier(2);
    const arrivals: string[] = [];

    const first = barrier.wait().then(() => arrivals.push('first'));
    await Promise.resolve();
    expect(arrivals).toEqual([]);

    const second = barrier.wait().then(() => arrivals.push('second'));
    await Promise.all([first, second]);

    expect(arrivals).toEqual(['first', 'second']);
  });

  it('releases all participants once the configured count arrives', async () => {
    const barrier = createBarrier(3);
    const participants = [barrier.wait(), barrier.wait(), barrier.wait()];

    await expect(Promise.all(participants)).resolves.toEqual([undefined, undefined, undefined]);
  });

  it('rejects all waiting participants with expected and arrived counts when it times out', async () => {
    jest.useFakeTimers();
    const barrier = createBarrier(3, { timeoutMs: 100 });
    const first = expect(barrier.wait()).rejects.toThrow(
      'Concurrency barrier timed out: expected 3 participants, but only 2 arrived.',
    );
    const second = expect(barrier.wait()).rejects.toThrow(
      'Concurrency barrier timed out: expected 3 participants, but only 2 arrived.',
    );

    await jest.advanceTimersByTimeAsync(100);
    await Promise.all([first, second]);
  });

  it('is terminal after release or abort', async () => {
    const released = createBarrier(1);
    await released.wait();
    await expect(released.wait()).resolves.toBeUndefined();

    const aborted = createBarrier(2);
    const waiting = expect(aborted.wait()).rejects.toThrow('test abort');
    aborted.abort(new Error('test abort'));
    await waiting;
    await expect(aborted.wait()).rejects.toThrow('test abort');
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects an invalid participant count of %s', (participantCount) => {
    expect(() => createBarrier(participantCount)).toThrow('Barrier participant count must be a positive integer');
  });
});

describe('runConcurrently', () => {
  it('does not invoke an operation until every supplied operation is behind the shared gate', async () => {
    let secondOperationRegistered = false;
    const operations: Array<() => string> = [
      () => {
        expect(secondOperationRegistered).toBe(true);
        return 'first result';
      },
      () => 'second result',
    ];

    Object.defineProperty(operations, '1', {
      configurable: true,
      get: () => {
        secondOperationRegistered = true;
        return () => 'second result';
      },
    });

    const outcomes = await runConcurrently(operations);

    expect(outcomes).toEqual([
      { status: 'fulfilled', value: 'first result' },
      { status: 'fulfilled', value: 'second result' },
    ]);
  });

  it('preserves fulfilled values and rejections for every operation', async () => {
    const failure = new Error('expected failure');

    const outcomes = await runConcurrently([
      () => 'success',
      () => {
        throw failure;
      },
      async () => 'another success',
    ]);

    expect(outcomes).toEqual([
      { status: 'fulfilled', value: 'success' },
      { status: 'rejected', reason: failure },
      { status: 'fulfilled', value: 'another success' },
    ]);
  });
});
