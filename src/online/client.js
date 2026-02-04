export function createOnlineClient({
  url,
  onMessage,
  onStatus,
  socketFactory = (endpoint) => new WebSocket(endpoint),
}) {
  let socket = null;

  function connect() {
    if (socket) return;
    onStatus?.("connecting");
    socket = socketFactory(url);
    socket.onopen = () => onStatus?.("connected");
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
    if (!socket || socket.readyState !== 1) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }

  function close() {
    if (!socket) return;
    socket.close();
    socket = null;
  }

  return { connect, send, close };
}
