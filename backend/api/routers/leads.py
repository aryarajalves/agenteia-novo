"""
api/routers/leads.py — Roteador consolidado para gestão de leads e CRM.

Módulo refatorado e desacoplado em submódulos especializados dentro de:
- api.routers.leads_modules.time_utils (Fuso horário de Brasília)
- api.routers.leads_modules.qualification_routes (Leads qualificados e recalculate-score)
- api.routers.leads_modules.crm_pipeline (Pipeline Kanban do CRM e estágios)
- api.routers.leads_modules.crm_dispatch (Disparo em massa de templates WhatsApp)
- api.routers.leads_modules.assignment_routes (Atribuição de funis e fluxos de follow-up)
"""

import logging
from fastapi import APIRouter
from api.routers.leads_modules import (
    to_brasilia_time,
    qualification_router,
    list_qualified_leads,
    recalculate_lead_score_api,
    delete_qualified_lead,
    delete_crm_lead,
    crm_dispatch_router,
    MassDispatchLeadItem,
    CRMMassDispatchPayload,
    execute_crm_mass_dispatch,
    crm_pipeline_router,
    get_crm_pipeline_leads,
    update_lead_crm_stage,
    assignment_router,
    assign_qualification_funnel,
    assign_followup_funnel,
)
from zapvoice_utils import send_zapvoice_whatsapp_template
from lead_scoring_service import calculate_lead_score

logger = logging.getLogger(__name__)

# Roteador consolidado preservando tags=["Leads"]
router = APIRouter(tags=["Leads"])

# Inclusão dos submódulos
router.include_router(qualification_router)
router.include_router(crm_pipeline_router)
router.include_router(crm_dispatch_router)
router.include_router(assignment_router)

__all__ = [
    "router",
    "to_brasilia_time",
    "list_qualified_leads",
    "recalculate_lead_score_api",
    "delete_qualified_lead",
    "delete_crm_lead",
    "get_crm_pipeline_leads",
    "update_lead_crm_stage",
    "execute_crm_mass_dispatch",
    "MassDispatchLeadItem",
    "CRMMassDispatchPayload",
    "assign_qualification_funnel",
    "assign_followup_funnel",
    "send_zapvoice_whatsapp_template",
    "calculate_lead_score",
]
