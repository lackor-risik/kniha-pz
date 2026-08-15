#!/bin/bash
# Deploys the current `main` branch to the Synology NAS production instance.
#
# Usage: scripts/deploy-synology.sh
#
# Required env vars (no defaults - this repo is public, so NAS connection
# details must not be hardcoded). Set them in your shell, or copy
# .env.deploy.example to .env.deploy (gitignored) and this script will
# source it automatically:
#   NAS_HOST   - SSH host/IP of the Synology NAS
#   NAS_PORT   - SSH port
#   NAS_USER   - SSH user
#
# Optional env vars:
#   NAS_PATH   - path to the app checkout on the NAS (default: /volume1/docker/kniha-pz)
#   SSH_KEY    - path to the deploy SSH key (default: ~/.ssh/synology_deploy_ed25519)
#
# Requires: passwordless SSH key auth + passwordless sudo for docker/docker-compose
# on the NAS (see README.md "Docker Deployment" section).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# shellcheck disable=SC1091
[ -f "$REPO_ROOT/.env.deploy" ] && source "$REPO_ROOT/.env.deploy"

: "${NAS_HOST:?NAS_HOST nie je nastavené - exportuj env premennú alebo vytvor .env.deploy (viď .env.deploy.example)}"
: "${NAS_PORT:?NAS_PORT nie je nastavené - exportuj env premennú alebo vytvor .env.deploy (viď .env.deploy.example)}"
: "${NAS_USER:?NAS_USER nie je nastavené - exportuj env premennú alebo vytvor .env.deploy (viď .env.deploy.example)}"

NAS_PATH="${NAS_PATH:-/volume1/docker/kniha-pz}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/synology_deploy_ed25519}"

SSH="ssh -4 -i $SSH_KEY -p $NAS_PORT -o BatchMode=yes -o ConnectTimeout=10 $NAS_USER@$NAS_HOST"

log() { echo "▶ $1"; }

log "Pripájam sa na NAS ($NAS_USER@$NAS_HOST:$NAS_PORT)..."
$SSH "echo OK" > /dev/null || { echo "❌ SSH pripojenie zlyhalo"; exit 1; }

log "Zálohujem databázu (pred akoukoľvek zmenou)..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
$SSH "cd $NAS_PATH && sudo -n /usr/local/bin/docker-compose exec -T db pg_dump -U kniha_pz kniha_pz > $BACKUP_FILE && ls -la $BACKUP_FILE"

log "Sťahujem najnovšiu verziu (git pull)..."
$SSH "cd $NAS_PATH && git pull origin main"

log "Rebuild a reštart kontajnerov (toto môže trvať pár minút)..."
$SSH "cd $NAS_PATH && sudo -n /usr/local/bin/docker-compose down && sudo -n /usr/local/bin/docker-compose up -d --build"

log "Čakám na naštartovanie aplikácie..."
sleep 8

log "Health-check..."
HEALTH=$($SSH "curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000" || echo "000")
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "307" ] || [ "$HEALTH" = "302" ]; then
    echo "✅ Deploy úspešný - appka odpovedá (HTTP $HEALTH)"
else
    echo "⚠️  Appka neodpovedá ako očakávané (HTTP $HEALTH) - skontroluj logy:"
    echo "    ssh -i $SSH_KEY -p $NAS_PORT $NAS_USER@$NAS_HOST 'cd $NAS_PATH && sudo -n /usr/local/bin/docker-compose logs --tail=50 app'"
    exit 1
fi

log "Posledné riadky logov:"
$SSH "cd $NAS_PATH && sudo -n /usr/local/bin/docker-compose logs --tail=15 app"

echo ""
echo "🎉 Nasadené. Záloha pred deployom: $NAS_PATH/$BACKUP_FILE"
