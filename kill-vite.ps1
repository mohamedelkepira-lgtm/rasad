# RASAD helper - kills old vite/node + frees port 5173 + writes network IP to ip.txt
$ErrorActionPreference = 'SilentlyContinue'

# 1) Kill old vite/node processes
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'vite' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# 2) Free port 5173 from any lingering process
Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue |
  ForEach-Object {
    try { Stop-Process -Id $_.OwningProcess -Force } catch {}
  }

Start-Sleep -Milliseconds 500

# 3) Resolve LAN IP and write to ip.txt
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -like '192.168.*' } |
  Select-Object -First 1).IPAddress
if (-not $ip) { $ip = 'localhost' }
Set-Content -Path (Join-Path $PSScriptRoot 'ip.txt') -Value $ip -Encoding ASCII