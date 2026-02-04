# Five Star Cards

Browser-based two-player card game prototype.

## Run The App

1. Start a local server from the project root:

```bash
python3 -m http.server 8000
```

2. Open the app in your browser:

```
http://localhost:8000
```

## Run The Online Server (Prototype)

1. Install dependencies:

```bash
npm install
```

2. Start the WebSocket server:

```bash
npm run server
```

3. Open the app and choose Online mode. Use the lobby to create or join a room.

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
