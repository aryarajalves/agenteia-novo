# Script para rodar testes dentro dos containers Docker

Write-Host "🐳 Iniciando testes via Docker..." -ForegroundColor Cyan

# 1. Testes do Backend
Write-Host "`n🐍 [1/2] Rodando testes no container 'backend-agente-local'..." -ForegroundColor Yellow
docker exec -it backend-agente-local pytest
$backendResult = $LASTEXITCODE

if ($backendResult -ne 0) {
    Write-Host "`n❌ Falha nos testes do Backend (Docker)!" -ForegroundColor Red
    exit $backendResult
}

# 2. Testes do Frontend
Write-Host "`n⚛️ [2/2] Rodando testes no container 'frontend-agente-local'..." -ForegroundColor Yellow
docker exec -it frontend-agente-local npm run test:e2e
$frontendResult = $LASTEXITCODE

if ($frontendResult -ne 0) {
    Write-Host "`n❌ Falha nos testes do Frontend (Docker)!" -ForegroundColor Red
    exit $frontendResult
}

Write-Host "`n✅ Todos os testes via Docker passaram com sucesso!" -ForegroundColor Green
