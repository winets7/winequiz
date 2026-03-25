# Один раз введите пароль root — ключ добавится на сервер, дальше вход без пароля.
$key = Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" -Raw
$key = $key.TrimEnd()
ssh root@85.239.48.51 "mkdir -p .ssh && chmod 700 .ssh && echo '$key' >> .ssh/authorized_keys && chmod 600 .ssh/authorized_keys"
