$body = @{
    email = "mainelew25@gmail.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body $body
    
    Write-Host "`n=== LOGIN TEST RESULT ===" -ForegroundColor Green
    Write-Host "Success: " -NoNewline
    Write-Host $resp.success -ForegroundColor Cyan
    Write-Host "Message: " -NoNewline
    Write-Host $resp.message -ForegroundColor Cyan
    Write-Host "User Email: " -NoNewline
    Write-Host $resp.data.user.email -ForegroundColor Yellow
    Write-Host "User Role: " -NoNewline
    Write-Host $resp.data.user.role -ForegroundColor Yellow
    Write-Host "Token Received: " -NoNewline
    Write-Host ($resp.data.token -ne $null) -ForegroundColor Green
    Write-Host "Token (first 50 chars): " -NoNewline
    Write-Host $resp.data.token.Substring(0, 50) -ForegroundColor Gray
    Write-Host "`n✅ SUPER ADMIN LOGIN VERIFIED!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ LOGIN FAILED!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
