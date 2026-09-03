#!/usr/bin/env python3
"""
Auditoria de Dependências de Terceiros (Backend Python)
Consulta a base de dados de vulnerabilidades de código aberto (OSV.dev / PyPI Advisory DB)
para identificar vulnerabilidades conhecidas (CVE/GHSA) e indicar versões corrigidas.
"""

import os
import sys
import re
import json
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

OSV_QUERY_URL = "https://api.osv.dev/v1/query"
DEFAULT_REQUIREMENTS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "requirements.txt"
)


def parse_requirements(file_content: str) -> List[Dict[str, str]]:
    """
    Analisa o conteúdo de um arquivo requirements.txt e extrai nome e versão dos pacotes.
    Suporta comentários, extras [extras] e operadores de versão (==, >=, <=, <, >, ~=).
    """
    packages = []
    for line in file_content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Remove comentários inline
        clean = line.split("#")[0].strip()
        if not clean:
            continue
        
        # Regex para capturar pacote e versão
        match = re.match(r"^([a-zA-Z0-9_\-\.\[\]]+)\s*([=><~^!]+)\s*([0-9a-zA-Z\.\-_]+)", clean)
        if match:
            raw_pkg = match.group(1).strip()
            operator = match.group(2).strip()
            version = match.group(3).strip()
            pkg_name = raw_pkg.split("[")[0].strip()
            packages.append({
                "raw_name": raw_pkg,
                "name": pkg_name,
                "operator": operator,
                "version": version,
                "original_line": clean
            })
        else:
            clean_pkg = clean.split("[")[0].strip()
            if re.match(r"^[a-zA-Z0-9_\-\.]+$", clean_pkg):
                packages.append({
                    "raw_name": clean,
                    "name": clean_pkg,
                    "operator": "",
                    "version": "",
                    "original_line": clean
                })
    return packages


def query_package_vulnerabilities(package_name: str, version: str, timeout: int = 10) -> List[Dict[str, Any]]:
    """
    Consulta a API da OSV.dev para um pacote específico e versão no ecossistema PyPI.
    """
    if not version:
        return []
    
    payload = {
        "package": {
            "name": package_name,
            "ecosystem": "PyPI"
        },
        "version": version
    }
    
    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            OSV_QUERY_URL,
            data=req_data,
            headers={"Content-Type": "application/json", "User-Agent": "AgenteIA-SecurityAudit/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("vulns", [])
    except Exception as e:
        return [{"error": str(e), "package": package_name}]


def extract_vulnerability_details(vuln_obj: Dict[str, Any], package_name: str) -> Dict[str, Any]:
    """
    Extrai informações estruturadas de uma vulnerabilidade retornada pela OSV.
    """
    vuln_id = vuln_obj.get("id", "DESCONHECIDO")
    summary = vuln_obj.get("summary") or vuln_obj.get("details", "Sem descrição disponível.")
    if len(summary) > 120:
        summary = summary[:117] + "..."
    
    severity = "DESCONHECIDA"
    db_specific = vuln_obj.get("database_specific", {})
    if "severity" in db_specific and db_specific["severity"]:
        severity = str(db_specific["severity"]).upper()
    elif vuln_obj.get("severity"):
        for sev in vuln_obj.get("severity", []):
            if "score" in sev:
                severity = f"CVSS {sev['score']}"
                break

    fixed_versions = []
    for affected in vuln_obj.get("affected", []):
        aff_pkg = affected.get("package", {}).get("name", "").lower()
        if aff_pkg and aff_pkg != package_name.lower():
            continue
        for rnge in affected.get("ranges", []):
            for event in rnge.get("events", []):
                if "fixed" in event:
                    fixed_versions.append(event["fixed"])
    
    aliases = vuln_obj.get("aliases", [])
    
    return {
        "id": vuln_id,
        "aliases": aliases,
        "summary": summary,
        "severity": severity,
        "fixed_versions": sorted(list(set(fixed_versions)))
    }


def audit_requirements(file_path: Optional[str] = None, max_workers: int = 10) -> Dict[str, Any]:
    """
    Executa a auditoria completa de dependências a partir do arquivo requirements.txt.
    """
    path = file_path or DEFAULT_REQUIREMENTS_PATH
    if not os.path.exists(path):
        return {
            "success": False,
            "error": f"Arquivo não encontrado: {path}",
            "total_packages": 0,
            "vulnerable_packages": [],
            "clean_packages": []
        }
    
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    packages = parse_requirements(content)
    vulnerable_results = []
    clean_results = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_pkg = {
            executor.submit(query_package_vulnerabilities, p["name"], p["version"]): p
            for p in packages
        }
        for future in as_completed(future_to_pkg):
            pkg_info = future_to_pkg[future]
            try:
                vulns_raw = future.result()
            except Exception as e:
                vulns_raw = [{"error": str(e)}]
            
            valid_vulns = [v for v in vulns_raw if "error" not in v]
            if valid_vulns:
                parsed_vulns = [
                    extract_vulnerability_details(v, pkg_info["name"])
                    for v in valid_vulns
                ]
                
                all_fixed = []
                for pv in parsed_vulns:
                    all_fixed.extend(pv["fixed_versions"])
                
                recommended_version = sorted(list(set(all_fixed)))[-1] if all_fixed else "Verificar manualmente"
                
                vulnerable_results.append({
                    "package": pkg_info["name"],
                    "current_version": pkg_info["version"],
                    "raw_spec": pkg_info["original_line"],
                    "vulnerabilities_count": len(parsed_vulns),
                    "vulnerabilities": parsed_vulns,
                    "recommended_version": recommended_version
                })
            else:
                clean_results.append(pkg_info)
    
    vulnerable_results.sort(key=lambda x: x["package"].lower())
    clean_results.sort(key=lambda x: x["name"].lower())
    
    return {
        "success": True,
        "requirements_path": path,
        "total_packages": len(packages),
        "vulnerable_count": len(vulnerable_results),
        "clean_count": len(clean_results),
        "vulnerable_packages": vulnerable_results,
        "clean_packages": clean_results
    }


def format_cli_report(audit_result: Dict[str, Any]) -> str:
    """
    Formata o resultado da auditoria para exibição elegante no terminal.
    """
    if not audit_result.get("success"):
        return f"❌ Erro na auditoria: {audit_result.get('error')}"
    
    lines = []
    lines.append("\n" + "=" * 78)
    lines.append("🛡️  RELATÓRIO DE AUDITORIA DE SEGURANÇA - DEPENDÊNCIAS PYTHON (BACKEND)")
    lines.append("=" * 78)
    lines.append(f"Arquivo analisado: {audit_result.get('requirements_path')}")
    lines.append(f"Total de pacotes verificados: {audit_result.get('total_packages')}")
    lines.append(f"Pacotes seguros: {audit_result.get('clean_count')}")
    lines.append(f"Pacotes vulneráveis: {audit_result.get('vulnerable_count')}")
    lines.append("-" * 78)
    
    vulns = audit_result.get("vulnerable_packages", [])
    if not vulns:
        lines.append("\n✅ NENHUMA VULNERABILIDADE CONHECIDA ENCONTRADA!")
        lines.append("Todas as dependências estão seguras conforme a base de dados OSV.dev/PyPI.\n")
    else:
        lines.append(f"\n⚠️  ATENÇÃO: Foram encontradas {len(vulns)} dependência(s) com vulnerabilidades conhecidas:\n")
        for v in vulns:
            lines.append(f"📦 Pacote: {v['package']} (Versão atual: {v['current_version']})")
            lines.append(f"   💡 Versão recomendada/corrigida: >= {v['recommended_version']}")
            lines.append(f"   🚨 Total de falhas reportadas: {v['vulnerabilities_count']}")
            for item in v["vulnerabilities"]:
                aliases_str = f" ({', '.join(item['aliases'])})" if item['aliases'] else ""
                lines.append(f"   • [{item['severity']}] {item['id']}{aliases_str}")
                lines.append(f"     Resumo: {item['summary']}")
                if item["fixed_versions"]:
                    lines.append(f"     Corrigido em: {', '.join(item['fixed_versions'])}")
            lines.append("   " + "-" * 70)
        
        lines.append("\n🔧 RECOMENDAÇÃO DE CORREÇÃO:")
        lines.append("Atualize os pacotes acima no 'requirements.txt' para as versões recomendadas.")
    
    lines.append("=" * 78 + "\n")
    return "\n".join(lines)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    import argparse
    parser = argparse.ArgumentParser(description="Auditor de Vulnerabilidades de Dependências Python")
    parser.add_argument("--requirements", "-r", default=None, help="Caminho para o arquivo requirements.txt")
    parser.add_argument("--json", "-j", action="store_true", help="Retorna a saída em formato JSON")
    parser.add_argument("--fail-on-vuln", "-f", action="store_true", help="Retorna código de saída 1 se houver vulnerabilidades")
    args = parser.parse_args()
    
    result = audit_requirements(args.requirements)
    
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(format_cli_report(result))
    
    if args.fail_on_vuln and result.get("vulnerable_count", 0) > 0:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
