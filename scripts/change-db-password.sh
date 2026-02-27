#!/bin/bash
set -e
NEWPASS=$(head -c 64 /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 20)
echo "Generated password (save it): $NEWPASS"
sudo -u postgres psql -c "ALTER USER winequiz PASSWORD '$NEWPASS';"
ENV_FILE="/var/www/winequiz/.env"
sed -i "s|postgresql://winequiz:[^@]*@localhost:5432/winequiz_db|postgresql://winequiz:${NEWPASS}@localhost:5432/winequiz_db|" "$ENV_FILE"
echo "Updated .env"
cd /var/www/winequiz && pm2 restart winequiz-web winequiz-socket
echo "PM2 restarted. New password: $NEWPASS"
