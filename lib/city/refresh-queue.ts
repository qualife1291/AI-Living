/** One read at a time. A force refresh during I/O requests one follow-up so
 * a write ACK cannot be followed only by a snapshot captured before the write. */
export function createRefreshQueue(read: () => Promise<void>) {
  let active: Promise<void> | null = null, generation = 0;
  return (force = false): Promise<void> => {
    if (force) generation++;
    if (active) return active;
    active = new Promise<void>((resolve, reject) => {
      const drain = async () => {
        try {
          let started: number;
          do { started = generation; await read(); } while (started !== generation);
          // Clear synchronously before resolving: force calls in the completion
          // microtask must start a fresh read rather than join a finished drain.
          active = null; resolve();
        } catch (error) { active = null; reject(error); }
      };
      void Promise.resolve().then(drain);
    });
    return active;
  };
}
