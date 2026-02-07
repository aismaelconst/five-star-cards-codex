# Five Star Cards

Browser-based two-player card game prototype.

## Run The App

1. Install dependencies:

```bash
npm install
```

2. Start the combined server (static + WebSocket):

```bash
npm start
```

3. Open the app in your browser:

```
http://localhost:8080
```

## Run The Online Server (Prototype)

The main server already includes WebSocket support. Start it with:

```bash
npm start
```

Then open the app and choose Online mode. Use the lobby to create or join a room.

## Run Tests

1. Install dependencies:

```bash
npm install
```

2. Run the test suite:

```bash
npm test
```

3. Run coverage:

```bash
npm run coverage
```

## Notes

- The app uses ES modules, so it must be served from a local server (not opened directly as a file).

## Hosting (Single Node)

This project can be deployed as a single Node process that serves both the static client and WebSocket server.

Suggested platforms:
- Render (Web Service)
- Fly.io (HTTP + WS)
- DigitalOcean App Platform

Set `PORT` in the hosting environment. The server will bind both HTTP and WS to that port.
