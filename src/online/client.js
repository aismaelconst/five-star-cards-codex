export function createOnlineClient({
  url,
  onMessage,
  onStatus,
  socketFactory = (endpoint) => new WebSocket(endpoint),
}) {
  let socket = null;
  const queue = [];

  function connect() {
    if (socket) return;
    onStatus?.("connecting");
    socket = socketFactory(url);
    socket.onopen = () => {
      onStatus?.("connected");
      while (queue.length > 0) {
        socket.send(queue.shift());
      }
    };
    socket.onclose = () => onStatus?.("disconnected");
    socket.onerror = () => onStatus?.("error");
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch {
        onMessage?.({ type: "error", message: "Invalid server payload" });
      }
    };
  }

  function send(payload) {
    if (!socket) return false;
    const data = JSON.stringify(payload);
    if (socket.readyState !== 1) {
      queue.push(data);
      return true;
    }
    socket.send(data);
    return true;
  }

  function close() {
    if (!socket) return;
    socket.close();
    socket = null;
  }

  return { connect, send, close };
}
