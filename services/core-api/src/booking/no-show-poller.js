function createNoShowPoller(repository, timers = globalThis) {
  let interval;
  let running = false;
  async function sweep() {
    if (running) return;
    running = true;
    try {
      await repository.markOverdueNoShows();
    } catch (error) {
      console.error("Failed to finalize overdue appointments", error);
    } finally {
      running = false;
    }
  }
  return {
    async start() {
      await sweep();
      interval = timers.setInterval(sweep, 60_000);
    },
    stop() {
      if (interval !== undefined) timers.clearInterval(interval);
      interval = undefined;
    },
  };
}

module.exports = { createNoShowPoller };
