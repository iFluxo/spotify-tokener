# spotify-tokener

A simple Bun/TypeScript service which returns Spotify anonymous & account tokens without having to deal with their annoying TOTP shit.

## Installation

For god's sake, just use docker. Otherwise, have fun running it yourself:

### Manual

Requirements:

* [Bun 1.4+](https://bun.sh/docs/installation)

```bash
git clone https://github.com/iFluxo/spotify-tokener.git
cd spotify-tokener
bun install
bun run start
```

Now run it via systemd or something.

### Docker

Create your `compose.yml` and run `docker compose up -d`.

```yaml
services:
  spotify-tokener:
    image: ghcr.io/ifluxo/spotify-tokener:master
    container_name: spotify-tokener
    restart: unless-stopped
    environment:
#      - SPOTIFY_TOKENER_ADDR=0.0.0.0:8080
#      - SPOTIFY_TOKENER_LOG_LEVEL=INFO
#      - SPOTIFY_TOKENER_TIMEOUT=30000
    ports:
      - 8080:8080
```


## Usage

The endpoint is under `/api/token` and cookies are relayed 1:1 (like the sp_dc cookie for account login).

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Contributing

Contributions are welcome, but for bigger changes, please open an issue first to discuss what you would like to change.

## Contact

- Discord: [`@fluxovoid`](https://discord.com/users/561170896480501790)