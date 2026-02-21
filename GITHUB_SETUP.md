# Подключение проекта к GitHub

Выполните команды **в терминале на своём компьютере** (PowerShell или CMD), где установлен Git.

## 1. Установите Git (если ещё не установлен)

Скачайте с https://git-scm.com/download/win и установите. Перезапустите терминал.

## 2. Репозиторий на GitHub

Используется репозиторий: **https://github.com/winets7/winequiz**

## 3. Вариант: скачали проект с GitHub — подключаем **без перезаписи истории**

В папке проекта запустите скрипт (один раз):

```powershell
cd c:\Users\Comp\Documents\vintaste
.\connect-github.ps1
```

Скрипт сделает: `git init` → `remote add origin` → `fetch` → коммит ваших локальных изменений → `pull --allow-unrelated-histories` → `push`. Если появятся конфликты слияния, скрипт подскажет, что сделать.

**Вручную** (если не хотите скрипт):

```powershell
cd c:\Users\Comp\Documents\vintaste
git init
git remote add origin https://github.com/winets7/winequiz.git
git fetch origin
git add -A
git commit -m "Локальные изменения (исправление кодировки и др.)"
git branch -M main
git pull origin main --allow-unrelated-histories
# При конфликтах: разрешите, затем git add -A && git commit
git push -u origin main
```

Если предпочитаете SSH: `git remote add origin git@github.com:winets7/winequiz.git`

## 4. Авторизация

- **HTTPS:** при первом `git push` браузер или Git запросят логин и пароль. Для пароля используйте [Personal Access Token](https://github.com/settings/tokens) (классический токен с правом `repo`).
- **SSH:** настройте ключ: https://docs.github.com/ru/authentication/connecting-to-github-with-ssh

После этого проект будет подключён к GitHub, и вы сможете делать `git push` по правилам из `.cursorrules`.
