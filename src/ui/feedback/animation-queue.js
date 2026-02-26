export function createAnimationQueue() {
  let tail = Promise.resolve();

  function enqueue(task) {
    tail = tail
      .catch(() => {})
      .then(async () => {
        if (typeof task !== "function") return null;
        return task();
      });
    return tail;
  }

  function flush() {
    return tail.catch(() => {});
  }

  function clear() {
    tail = Promise.resolve();
  }

  return {
    enqueue,
    flush,
    clear,
  };
}
