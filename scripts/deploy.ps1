# Деплой на сервер: pull, install, build, pm2 restart
# Требуется: SSH-ключ настроен (см. docs/SSH-KEY-SETUP.md)

$serverHost = "85.239.48.51"
$user = "root"
$path = "/var/www/winequiz"

$cmd = "cd $path && git pull && npm install && npm run build && pm2 restart winequiz-web winequiz-socket"
Write-Host "Deploy: ssh ${user}@${serverHost} -> $path" -ForegroundColor Cyan
Write-Host "Running: $cmd" -ForegroundColor Gray
ssh "${user}@${serverHost}" $cmd
