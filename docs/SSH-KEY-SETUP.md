# Настройка входа по SSH-ключу на сервер

## Что уже сделано

1. **Создан SSH-ключ** на вашем ПК:
   - Приватный: `C:\Users\Comp\.ssh\id_ed25519` (никому не показывать)
   - Публичный: `C:\Users\Comp\.ssh\id_ed25519.pub`

## Что сделать вам (один раз)

### Шаг 1. Добавить ключ на сервер

**Важно:** этот шаг выполняется **на вашем ПК (Windows)**, в PowerShell или Терминале Cursor — **не** в SSH-сессии на сервере. Скрипт читает ключ с вашего диска и отправляет его на сервер.

Откройте **PowerShell** или **Терминал** (локально) и выполните (при запросе введите пароль root **один раз**):

```powershell
$key = (Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" -Raw).TrimEnd()
ssh root@85.239.48.51 "mkdir -p .ssh && chmod 700 .ssh && echo '$key' >> .ssh/authorized_keys && chmod 600 .ssh/authorized_keys"
```

Либо запустите скрипт из проекта:

```powershell
cd C:\Users\Comp\Documents\vintaste
.\scripts\ssh-copy-key.ps1
```

Если PowerShell пишет, что «выполнение сценариев отключено», не меняя политику, выполните команды вручную (скопируйте и вставьте по очереди):

```powershell
$key = (Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" -Raw).TrimEnd()
ssh root@85.239.48.51 "mkdir -p .ssh && chmod 700 .ssh && echo '$key' >> .ssh/authorized_keys && chmod 600 .ssh/authorized_keys"
```

### Шаг 2. Проверить вход без пароля

```powershell
ssh root@85.239.48.51 "echo OK"
```

Если выведется `OK` без запроса пароля — настройка завершена. Дальше деплой из Cursor сможет подключаться по SSH без вашего участия.

### Шаг 3 (по желанию). Алиас в SSH config

Чтобы агент и вы могли использовать короткую команду `ssh vintaste`, добавьте в `C:\Users\Comp\.ssh\config` (создайте файл, если его нет):

```
Host vintaste
    HostName 85.239.48.51
    User root
```

После этого: `ssh vintaste` равносильно `ssh root@85.239.48.51`.

---

**Ваш публичный ключ** (для ручного добавления на сервер, если нужно):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAX/Jpe/W53r5wM23BTw2H5UROdWrGDdXu49jt5oXpho comp@DESKTOP-1E5NLNC
```

Ручное добавление на сервере (после входа по паролю):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAX/Jpe/W53r5wM23BTw2H5UROdWrGDdXu49jt5oXpho comp@DESKTOP-1E5NLNC' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```
