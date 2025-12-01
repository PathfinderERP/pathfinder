# Quick DNS Fix Script for MongoDB Atlas Connection Issues
# This script changes your DNS to Google DNS (8.8.8.8) to fix MongoDB Atlas connection issues

Write-Host "🔧 MongoDB Atlas DNS Fix Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script requires Administrator privileges!" -ForegroundColor Yellow
    Write-Host "`nPlease run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host "`nTo run as Administrator:" -ForegroundColor White
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Run this script again`n" -ForegroundColor White
    pause
    exit
}

# Get active network adapter
$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1

if (-not $adapter) {
    Write-Host "❌ No active network adapter found!" -ForegroundColor Red
    pause
    exit
}

Write-Host "📡 Active Network Adapter: $($adapter.Name)" -ForegroundColor Green
Write-Host "`nCurrent DNS Servers:" -ForegroundColor Yellow
Get-DnsClientServerAddress -InterfaceAlias $adapter.Name -AddressFamily IPv4 | Select-Object -ExpandProperty ServerAddresses

Write-Host "`n⚠️  This will change your DNS servers to:" -ForegroundColor Yellow
Write-Host "   Primary:   8.8.8.8 (Google DNS)" -ForegroundColor White
Write-Host "   Secondary: 8.8.4.4 (Google DNS)" -ForegroundColor White

$confirm = Read-Host "`nDo you want to continue? (Y/N)"

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "`n❌ Operation cancelled." -ForegroundColor Red
    pause
    exit
}

try {
    # Set DNS servers to Google DNS
    Set-DnsClientServerAddress -InterfaceAlias $adapter.Name -ServerAddresses ("8.8.8.8", "8.8.4.4")
    
    Write-Host "`n✅ DNS servers updated successfully!" -ForegroundColor Green
    
    # Flush DNS cache
    Write-Host "`n🔄 Flushing DNS cache..." -ForegroundColor Cyan
    Clear-DnsClientCache
    
    Write-Host "✅ DNS cache cleared!" -ForegroundColor Green
    
    # Display new DNS settings
    Write-Host "`n📋 New DNS Configuration:" -ForegroundColor Cyan
    Get-DnsClientServerAddress -InterfaceAlias $adapter.Name -AddressFamily IPv4 | Select-Object -ExpandProperty ServerAddresses
    
    Write-Host "`n✅ All done! Your MongoDB Atlas connection should work now." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your Node.js application" -ForegroundColor White
    Write-Host "2. Test the MongoDB connection`n" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPlease try manually changing DNS settings:" -ForegroundColor Yellow
    Write-Host "1. Open Network Connections (ncpa.cpl)" -ForegroundColor White
    Write-Host "2. Right-click your network adapter → Properties" -ForegroundColor White
    Write-Host "3. Select IPv4 → Properties" -ForegroundColor White
    Write-Host "4. Use DNS: 8.8.8.8 and 8.8.4.4`n" -ForegroundColor White
}

# Option to revert DNS settings
Write-Host "`n💡 To revert to automatic DNS later, run:" -ForegroundColor Cyan
Write-Host "   Set-DnsClientServerAddress -InterfaceAlias '$($adapter.Name)' -ResetServerAddresses`n" -ForegroundColor White

pause
