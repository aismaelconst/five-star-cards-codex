import { describe, it, expect, vi } from "vitest";
import { createOnlineClient } from "../src/online/client.js";

describe("online client", () => {
  it("connects and sends messages", () => {
    const handlers = {};
    const fakeSocket = {
      readyState: 1,
      send: vi.fn(),
      close: vi.fn(),
      set onopen(fn) {
        handlers.open = fn;
      },
      set onclose(fn) {
        handlers.close = fn;
      },
      set onerror(fn) {
        handlers.error = fn;
      },
      set onmessage(fn) {
        handlers.message = fn;
      },
    };

    const onMessage = vi.fn();
    const onStatus = vi.fn();
    const client = createOnlineClient({
      url: "ws://test",
      onMessage,
      onStatus,
      socketFactory: () => fakeSocket,
    });

    client.connect();
    handlers.open();
    expect(onStatus).toHaveBeenCalledWith("connected");

    client.send({ type: "ping" });
    expect(fakeSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: "ping" }));

    handlers.message({ data: JSON.stringify({ type: "pong" }) });
    expect(onMessage).toHaveBeenCalledWith({ type: "pong" });

    client.close();
    expect(fakeSocket.close).toHaveBeenCalled();
  });

  it("queues messages before socket opens", () => {
    const handlers = {};
    const fakeSocket = {
      readyState: 0,
      send: vi.fn(),
      close: vi.fn(),
      set onopen(fn) {
        handlers.open = fn;
      },
      set onclose(fn) {},
      set onerror(fn) {},
      set onmessage(fn) {},
    };

    const client = createOnlineClient({
      url: "ws://test",
      socketFactory: () => fakeSocket,
    });

    client.connect();
    const queued = client.send({ type: "queued" });
    expect(queued).toBe(true);
    expect(fakeSocket.send).not.toHaveBeenCalled();

    fakeSocket.readyState = 1;
    handlers.open();
    expect(fakeSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: "queued" }));
  });

  it("handles invalid server payload", () => {
    const onMessage = vi.fn();
    const client = createOnlineClient({
      url: "ws://test",
      onMessage,
      socketFactory: () => ({
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        set onopen(fn) {},
        set onclose(fn) {},
        set onerror(fn) {},
        set onmessage(fn) {
          fn({ data: "not-json" });
        },
      }),
    });

    client.connect();
    expect(onMessage).toHaveBeenCalledWith({
      type: "error",
      message: "Invalid server payload",
    });
  });
});
