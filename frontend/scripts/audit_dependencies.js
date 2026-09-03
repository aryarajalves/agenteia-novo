#!/usr/bin/env node
/**
 * Auditoria de Dependências de Terceiros (Frontend Node.js / React)
 * Executa a auditoria de segurança via npm audit e gera relatório detalhado
 * com vulnerabilidades, severidades e versões corrigidas recomendadas.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');

export function runNpmAudit() {
  try {
    const output = execSync('npm audit --json', {
      cwd: FRONTEND_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return JSON.parse(output);
  } catch (error) {
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseErr) {
        return { error: 'Falha ao processar saída JSON do npm audit: ' + parseErr.message };
      }
    }
    return { error: error.message };
  }
}

export function parseAuditReport(auditData) {
  if (auditData.error) {
    return {
      success: false,
      error: auditData.error
    };
  }

  const vulnerabilities = auditData.vulnerabilities || {};
  const metadata = auditData.metadata || { vulnerabilities: {} };
  
  const vulnList = [];

  for (const [pkgName, vulnInfo] of Object.entries(vulnerabilities)) {
    const via = vulnInfo.via || [];
    const advisories = via.filter(v => typeof v === 'object');
    const viaStrings = via.filter(v => typeof v === 'string');

    vulnList.push({
      package: pkgName,
      severity: (vulnInfo.severity || 'desconhecida').toUpperCase(),
      isDirect: vulnInfo.isDirect || false,
      range: vulnInfo.range || 'todas',
      advisories: advisories.map(a => ({
        id: a.source || a.url || 'N/A',
        title: a.title || 'Vulnerabilidade',
        severity: (a.severity || 'desconhecida').toUpperCase(),
        url: a.url || '',
        range: a.range || ''
      })),
      dependsOn: viaStrings,
      fixAvailable: vulnInfo.fixAvailable || false
    });
  }

  // Ordena por severidade (CRITICAL > HIGH > MODERATE > LOW)
  const severityRank = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, INFO: 0 };
  vulnList.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0));

  return {
    success: true,
    totalVulnerabilities: Object.keys(vulnerabilities).length,
    summary: metadata.vulnerabilities || {},
    vulnerabilities: vulnList
  };
}

export function formatConsoleReport(parsedResult) {
  if (!parsedResult.success) {
    return `❌ Erro ao auditar frontend: ${parsedResult.error}`;
  }

  const lines = [];
  lines.push('\n' + '='.repeat(78));
  lines.push('🛡️  RELATÓRIO DE AUDITORIA DE SEGURANÇA - DEPENDÊNCIAS NODE.JS (FRONTEND)');
  lines.push('='.repeat(78));
  
  const sum = parsedResult.summary;
  lines.push(`Total de falhas: ${parsedResult.totalVulnerabilities}`);
  lines.push(`Críticas: ${sum.critical || 0} | Altas: ${sum.high || 0} | Moderadas: ${sum.moderate || 0} | Baixas: ${sum.low || 0}`);
  lines.push('-'.repeat(78));

  if (parsedResult.totalVulnerabilities === 0) {
    lines.push('\n✅ NENHUMA VULNERABILIDADE CONHECIDA ENCONTRADA!');
    lines.push('Todas as dependências do frontend estão seguras.\n');
  } else {
    lines.push(`\n⚠️  ATENÇÃO: Foram encontradas ${parsedResult.totalVulnerabilities} dependência(s) com vulnerabilidades:\n`);
    
    for (const v of parsedResult.vulnerabilities) {
      lines.push(`📦 Pacote: ${v.package} [${v.severity}] (Dependência ${v.isDirect ? 'Direta' : 'Transitiva'})`);
      lines.push(`   Faixa afetada: ${v.range}`);
      
      for (const adv of v.advisories) {
        lines.push(`   • [${adv.severity}] ${adv.title}`);
        if (adv.url) lines.push(`     Link: ${adv.url}`);
      }
      if (v.dependsOn.length > 0) {
        lines.push(`   • Originado por: ${v.dependsOn.join(', ')}`);
      }
      if (typeof v.fixAvailable === 'object' && v.fixAvailable !== null) {
        lines.push(`   💡 Correção disponível: atualizar para ${v.fixAvailable.name}@${v.fixAvailable.version}`);
      } else if (v.fixAvailable === true) {
        lines.push(`   💡 Correção disponível via 'npm audit fix'`);
      }
      lines.push('   ' + '-'.repeat(70));
    }

    lines.push('\n🔧 RECOMENDAÇÕES DE CORREÇÃO:');
    lines.push('1. Execute: npm audit fix');
    lines.push('2. Para pacotes diretos desatualizados, atualize a versão correspondente no package.json.');
  }

  lines.push('='.repeat(78) + '\n');
  return lines.join('\n');
}

export function main() {
  const isJson = process.argv.includes('--json') || process.argv.includes('-j');
  const failOnVuln = process.argv.includes('--fail-on-vuln') || process.argv.includes('-f');
  
  const rawData = runNpmAudit();
  const parsed = parseAuditReport(rawData);

  if (isJson) {
    console.log(JSON.stringify(parsed, null, 2));
  } else {
    console.log(formatConsoleReport(parsed));
  }

  if (failOnVuln && parsed.totalVulnerabilities > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('audit_dependencies.js')) {
  main();
}
