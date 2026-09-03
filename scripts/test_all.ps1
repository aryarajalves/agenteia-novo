# Script para rodar todos os testes localmente (Backend e Frontend)

Write-Host "🚀 Iniciando suíte de testes locais..." -ForegroundColor Cyan

# 1. Testes do Backend
Write-Host "`n🐍 [1/2] Rodando testes do Backend (Pytest)..." -ForegroundColor Yellow
cd backend
pytest
$backendResult = $LASTEXITCODE
cd ..

if ($backendResult -ne 0) {
    Write-Host "`n❌ Falha nos testes do Backend! Interrompendo..." -ForegroundColor Red
    exit $backendResult
}

# 2. Testes do Frontend
Write-Host "`n⚛️ [2/2] Rodando testes do Frontend (Playwright)..." -ForegroundColor Yellow
cd frontend
npm run test:e2e
$frontendResult = $LASTEXITCODE
cd ..

if ($frontendResult -ne 0) {
    Write-Host "`n❌ Falha nos testes do Frontend!" -ForegroundColor Red
    exit $frontendResult
}

Write-Host "`n✅ Todos os testes passaram com sucesso!" -ForegroundColor Green
