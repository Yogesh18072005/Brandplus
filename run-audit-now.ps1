$body = @{
    businessName = "Krishnavi India"
    website = "krishnavindia.com"
    category = "logistics and courier services"
    city = "India"
    competitors = @("DHL", "FedEx", "Skyways")
    promptCount = 20
} | ConvertTo-Json -Depth 3

Write-Host "Starting audit for Krishnavi India..."
Write-Host "This will take 2-5 minutes. Please wait..."
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/run-audit" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 300

    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "===== AUDIT COMPLETE =====" -ForegroundColor Green
    Write-Host ""
    Write-Host "Visibility Score: $($result.scores.visibilityScore)/100" -ForegroundColor Yellow
    Write-Host "Presence Rate: $([math]::Round($result.scores.presenceRate * 100))%" -ForegroundColor Yellow
    Write-Host "Share of Voice: $([math]::Round($result.scores.shareOfVoice * 100))%" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Prompts Processed: $($result.promptsProcessed)"
    Write-Host "Total Mentions: $($result.totalMentions)"
    Write-Host "Top Recommendations: $($result.topRecommendations)"
    Write-Host "Cost: $($result.costSummary)"
    Write-Host ""
    
    if ($result.competitors) {
        Write-Host "--- Competitor Comparison ---" -ForegroundColor Cyan
        foreach ($comp in $result.competitors) {
            Write-Host "  $($comp.name): $([math]::Round($comp.presenceRate * 100))% presence"
        }
    }
    
    Write-Host ""
    Write-Host "Full report: http://localhost:3000$($result.reportUrl)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Raw JSON:"
    $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}
