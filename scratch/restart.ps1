$p = @(Get-NetTCPConnection -LocalPort 3000, 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
foreach ($id in $p) {
    if ($id) {
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    }
}
npm run dev
