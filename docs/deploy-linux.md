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
DB_PASSWORD=<pick-a-password> docker compose up -d --build
```

The API container runs `prisma migrate deploy` on start, so the schema is applied automatically.

Check it:

```bash
curl http://localhost:3000/health
```

## 3. Seed demo data (optional)

```bash
docker compose exec api sh -c "npx tsx prisma/seed.ts"
```

Note: seeding requires dev dependencies; if the production image lacks them, run the seed from a dev machine pointing `DATABASE_URL` at the Linux box instead.

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

## 5. Useful commands

```bash
docker compose logs -f api      # API logs
docker compose down             # stop (data persists in volumes)
docker compose down -v          # stop and DELETE data
git pull && docker compose up -d --build   # deploy an update
```
