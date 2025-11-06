$GOLD_TOKEN_ID = "8f530fc1-8f72-4d44-b063-cb948e798d7c"

Write-Host "=== DIVIDEND LOTTERY TEST WITH GOLD ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Logging in as demo user..." -ForegroundColor Yellow
$loginBody = '{"email":"demo@tokentradex.com","password":"Demo123!"}'
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "Logged in successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Staking 100 GOLD tokens for 90 days..." -ForegroundColor Yellow
$stakeBody = "{`"tokenId`":`"$GOLD_TOKEN_ID`",`"amount`":100,`"lockPeriod`":`"90`",`"autoCompound`":true}"
try {
    $stakeResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/staking/stake" -Method POST -Body $stakeBody -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
    Write-Host "Staked successfully" -ForegroundColor Green
} catch {
    Write-Host "Staking error: $_" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 3: Creating monthly dividend schedule for GOLD..." -ForegroundColor Yellow
$scheduleBody = "{`"tokenId`":`"$GOLD_TOKEN_ID`",`"paymentType`":`"dividend`",`"frequency`":`"monthly`",`"amountPerToken`":0.25}"
try {
    $scheduleResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/automation/schedule" -Method POST -Body $scheduleBody -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
    Write-Host "Schedule created successfully" -ForegroundColor Green
} catch {
    Write-Host "Schedule error: $_" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 4: Executing dividend payment..." -ForegroundColor Yellow
try {
    $executeResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/automation/execute/$GOLD_TOKEN_ID" -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
    Write-Host "Payment executed successfully!" -ForegroundColor Green
    Write-Host "Total distributed: $($executeResponse.execution.totalDistributed)" -ForegroundColor Cyan
} catch {
    Write-Host "Execute error: $_" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 5: Checking lottery history..." -ForegroundColor Yellow
try {
    $lotteryResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/dividend-mining/lottery?tokenId=$GOLD_TOKEN_ID&limit=10" -Method GET -Headers @{Authorization = "Bearer $token"}
    
    if ($lotteryResponse.history.lotteries.Count -gt 0) {
        Write-Host "LOTTERY DRAW FOUND!" -ForegroundColor Green
        $draw = $lotteryResponse.history.lotteries[0]
        Write-Host ""
        Write-Host "Winner: $($draw.winner.username)" -ForegroundColor Cyan
        Write-Host "Prize: `$$($draw.winnerPrize)" -ForegroundColor Green
        Write-Host "Multiplier: $($draw.multiplier)x" -ForegroundColor Magenta
        Write-Host "Total Pool: `$$($draw.totalPool)" -ForegroundColor Cyan
        Write-Host "Participants: $($draw.totalParticipants)" -ForegroundColor Cyan
    } else {
        Write-Host "No lottery draws found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Lottery history error: $_" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
