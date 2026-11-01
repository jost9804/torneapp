# Deploying TorneApp on a Linux machine

Target: a Linux box (Debian/Ubuntu assumed) on your local network serving the API + database, with phones and browsers connecting to it.

## 1. Install Docker

```bash
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER   # log out and back in afterwards
```

## 2. Clone and start

```bash
git clone https://github.com/jost9804/torneapp.git
cd torneapp
echo "DB_PASSWORD=$(openssl rand -hex 24)" > .env   # Compose reads .env automatically
chmod 600 .env
docker compose up -d --build
```

Keep the `.env` file: Postgres stores the password on first start, so every later `docker compose up` must use the same value.

The API container runs `prisma migrate deploy` on start, so the schema is applied automatically.

Check it:

```bash
curl http://localhost:3000/health
```

## 3. Seed demo data (optional)

```bash
docker compose exec api sh -c "npx tsx prisma/seed.ts"
```

Note: seeding requires dev dependencies; if the production image lacks them, run the seed from a dev machine instead. Postgres only listens on the server's localhost, so open an SSH tunnel first:

```bash
ssh -N -L 5433:localhost:5432 <user>@<server-ip>   # keep running in another terminal
cd apps/api
DATABASE_URL="postgresql://torneapp:<DB_PASSWORD>@localhost:5433/torneapp" npx tsx prisma/seed.ts
```

## 4. Connect the app

Find the machine's LAN IP (`ip addr`, e.g. `192.168.1.50`), then on the dev machine:

```bash
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=http://192.168.1.50:3000" > .env
npm run web       # or: npm start, and open in Expo Go on the phone
```

Phone and Linux box must be on the same network. Open port 3000 if a firewall is active:

```bash
sudo ufw allow 3000/tcp
```

## 5. Public web demo (Tailscale Funnel)

The `web` service builds the web app and serves it with Caddy on `127.0.0.1:8080`, proxying `/api` to the API. The API has no accounts yet, so Caddy puts the whole site behind one shared login. Tailscale Funnel publishes it over HTTPS at a fixed `https://<machine>.<tailnet>.ts.net` URL, without a domain or router changes.

Create the login and enable the profile (single quotes keep the `$` in the hash literal):

```bash
cd ~/torneapp
HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext '<password>')
cat >> .env <<EOF
COMPOSE_PROFILES=web
WEB_AUTH_USER=<user>
WEB_AUTH_HASH='$HASH'
EOF
docker compose up -d --build
curl -u <user>:<password> -o /dev/null -w "%{http_code}\n" localhost:8080/   # 200
```

Install Tailscale and publish port 8080 (the first `funnel` run prints a link to enable Funnel for the tailnet):

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
sudo tailscale funnel --bg 8080
tailscale funnel status   # shows the public URL
```

Funnel keeps running across reboots. Stop it with `sudo tailscale funnel --https=443 off`.

## 6. Useful commands

```bash
docker compose logs -f api      # API logs
docker compose logs -f web      # web proxy logs
docker compose down             # stop (data persists in volumes)
docker compose down -v          # stop and DELETE data
git pull && docker compose up -d --build   # deploy an update
```
