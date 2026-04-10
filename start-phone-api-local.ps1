$env:PHONE_DB_HOST = "127.0.0.1"
$env:PHONE_DB_PORT = "13306"
$env:PHONE_DB_USER = "phone"
$env:PHONE_DB_PASSWORD = "phone2025"
$env:PHONE_DB_NAME = "phone"
$env:PHONE_WS_PORT = "9096"
$env:PHONE_HTTP_PORT = "9097"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"
$script = Join-Path $root "服务器api.py"

& $python $script
