"""
Testes unitários para o script de auditoria de dependências (backend/scripts/audit_dependencies.py).
Valida o parsing de requirements.txt, extração de vulnerabilidades, resolução de versões corrigidas e relatórios.
"""

import sys
import os
import pytest
from unittest.mock import patch, MagicMock
import json

# Adiciona o diretório de scripts ao path para importação
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))

from audit_dependencies import (
    parse_requirements,
    extract_vulnerability_details,
    audit_requirements,
    format_cli_report,
    query_package_vulnerabilities,
)


class TestRequirementsParser:
    def test_parse_simple_pinned_requirements(self):
        sample = """
        fastapi==0.115.8
        uvicorn==0.34.0
        # Comentário que deve ser ignorado
        pydantic==2.10.6
        """
        packages = parse_requirements(sample)
        assert len(packages) == 3
        assert packages[0]["name"] == "fastapi"
        assert packages[0]["version"] == "0.115.8"
        assert packages[0]["operator"] == "=="

    def test_parse_with_extras_and_operators(self):
        sample = """
        passlib[bcrypt]==1.7.4
        bcrypt<5.0.0
        regex>=2024.1.1
        requests~=2.31.0
        assemblyai
        """
        packages = parse_requirements(sample)
        names = [p["name"] for p in packages]
        assert "passlib" in names
        assert "bcrypt" in names
        assert "regex" in names
        assert "requests" in names
        assert "assemblyai" in names

    def test_parse_ignores_inline_comments_and_empty_lines(self):
        sample = """
        # Comentário de cabeçalho
        fastapi==0.115.8   # Framework web
        
        uvicorn==0.34.0    # Servidor ASGI
        """
        packages = parse_requirements(sample)
        assert len(packages) == 2
        assert packages[0]["name"] == "fastapi"
        assert packages[0]["version"] == "0.115.8"


class TestVulnerabilityExtraction:
    def test_extract_details_with_cve_and_fixed_version(self):
        mock_vuln = {
            "id": "GHSA-9hjg-9r4m-mvj7",
            "summary": "Requests vulnerable to credentials leak",
            "aliases": ["CVE-2024-47081", "PYSEC-2026-1872"],
            "database_specific": {
                "severity": "MODERATE"
            },
            "affected": [
                {
                    "package": {"name": "requests"},
                    "ranges": [
                        {
                            "type": "ECOSYSTEM",
                            "events": [
                                {"introduced": "0"},
                                {"fixed": "2.32.4"}
                            ]
                        }
                    ]
                }
            ]
        }
        details = extract_vulnerability_details(mock_vuln, "requests")
        assert details["id"] == "GHSA-9hjg-9r4m-mvj7"
        assert "CVE-2024-47081" in details["aliases"]
        assert details["severity"] == "MODERATE"
        assert "2.32.4" in details["fixed_versions"]

    def test_extract_details_fallback_for_missing_fields(self):
        mock_vuln = {"id": "VULN-001"}
        details = extract_vulnerability_details(mock_vuln, "pacote")
        assert details["id"] == "VULN-001"
        assert details["severity"] == "DESCONHECIDA"
        assert details["fixed_versions"] == []


class TestAuditRequirementsExecution:
    @patch("audit_dependencies.query_package_vulnerabilities")
    def test_audit_detects_clean_requirements(self, mock_query, tmp_path):
        mock_query.return_value = []
        
        req_file = tmp_path / "test_requirements.txt"
        req_file.write_text("fastapi==0.115.8\nuvicorn==0.34.0\n", encoding="utf-8")
        
        result = audit_requirements(str(req_file))
        assert result["success"] is True
        assert result["total_packages"] == 2
        assert result["vulnerable_count"] == 0
        assert result["clean_count"] == 2

    @patch("audit_dependencies.query_package_vulnerabilities")
    def test_audit_detects_vulnerable_package(self, mock_query, tmp_path):
        mock_query.side_effect = lambda pkg, ver: [
            {
                "id": "GHSA-test-1234",
                "summary": "Falha de teste",
                "database_specific": {"severity": "HIGH"},
                "affected": [
                    {
                        "package": {"name": pkg},
                        "ranges": [{"events": [{"fixed": "2.0.0"}]}]
                    }
                ]
            }
        ] if pkg == "pacote-vulneravel" else []
        
        req_file = tmp_path / "test_requirements.txt"
        req_file.write_text("pacote-vulneravel==1.0.0\npacote-seguro==3.0.0\n", encoding="utf-8")
        
        result = audit_requirements(str(req_file))
        assert result["success"] is True
        assert result["vulnerable_count"] == 1
        assert result["clean_count"] == 1
        assert result["vulnerable_packages"][0]["package"] == "pacote-vulneravel"
        assert result["vulnerable_packages"][0]["recommended_version"] == "2.0.0"

    def test_audit_missing_file_returns_error(self):
        result = audit_requirements("caminho_inexistente_12345.txt")
        assert result["success"] is False
        assert "não encontrado" in result["error"]


class TestReportFormatting:
    def test_format_clean_report(self):
        result = {
            "success": True,
            "requirements_path": "requirements.txt",
            "total_packages": 2,
            "vulnerable_count": 0,
            "clean_count": 2,
            "vulnerable_packages": []
        }
        report = format_cli_report(result)
        assert "NENHUMA VULNERABILIDADE" in report

    def test_format_vulnerable_report(self):
        result = {
            "success": True,
            "requirements_path": "requirements.txt",
            "total_packages": 1,
            "vulnerable_count": 1,
            "clean_count": 0,
            "vulnerable_packages": [
                {
                    "package": "requests",
                    "current_version": "2.31.0",
                    "recommended_version": "2.32.4",
                    "vulnerabilities_count": 1,
                    "vulnerabilities": [
                        {
                            "id": "GHSA-9hjg-9r4m-mvj7",
                            "aliases": ["CVE-2024-47081"],
                            "severity": "HIGH",
                            "summary": "Falha de teste",
                            "fixed_versions": ["2.32.4"]
                        }
                    ]
                }
            ]
        }
        report = format_cli_report(result)
        assert "requests" in report
        assert "2.32.4" in report
        assert "GHSA-9hjg-9r4m-mvj7" in report
