do {
  npx eslint --fix
  npx prettier --write "src/**/*.{ts,tsx}"
  npm run build
  $status = $LASTEXITCODE
  if ($status -ne 0) {
    Write-Host "❌ Build failed. Retrying in 1s..." -ForegroundColor Red
    Start-Sleep -Seconds 1
  }
} until ($status -eq 0)
Write-Host "✅ Build succeeded!" -ForegroundColor Green 