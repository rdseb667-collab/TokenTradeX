Write-Host "===" -ForegroundColor Cyan
Write-Host "SETTING UP DEMO DATA AND TESTING LOTTERY" -ForegroundColor Cyan
Write-Host "===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating demo user and tokens..." -ForegroundColor Yellow
node create-super-admin.js
node seed-demo-data.js
Write-Host ""

Start-Sleep -Seconds 2

Write-Host "Now running lottery test..." -ForegroundColor Yellow
.\test-lottery.ps1
