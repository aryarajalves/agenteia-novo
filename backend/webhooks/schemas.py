import json
from typing import Optional, List, Any, Union
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class WebhookConfigCreate(BaseModel):
    name: str
    leads_table: str = "leads"
    description: Optional[str] = None
    disable_ai_responses: bool = False
    delay_seconds: int = 30
    agent_id: Optional[int] = None
    blocked_messages: List[str] = []
    allowed_contacts: List[str] = []
    zapvoice_url: Optional[str] = None
    zapvoice_api_token: Optional[str] = None
    zapvoice_client_id: Optional[str] = None
    labels_on_message: List[str] = []
    delete_keywords: List[str] = []
    delete_message: Optional[str] = None
    delete_labels: List[str] = []
    response_delay_seconds: int = 0
    split_response_enabled: bool = True
    window_close_label: List[str] = []
    followup_enabled: bool = False
    followup_steps: List[dict] = []
    followup_business_hours: Optional[dict] = None
    followup_cancel_label: Optional[str] = None
    followup_required_label: Optional[str] = None
    followup_add_label: Optional[str] = None
    followup_on_reply: Optional[str] = "stop"
    abandonment_delay_value: Optional[int] = 24
    abandonment_delay_unit: Optional[str] = "hours"
    purchased_label: Optional[str] = None
    memory_sync_enabled: bool = False
    memory_phone_path: str = "phone"
    memory_name_path: Optional[str] = None
    memory_mappings: List[dict] = []
    ignore_by_label: Optional[str] = None
    negative_feedback_label: Optional[str] = None
    handoff_labels_to_add: List[str] = []
    handoff_labels_to_remove: List[str] = []
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: List[str] = []
    ai_handoff_labels_to_remove: List[str] = []
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    token: Optional[str] = None
    memory_token: Optional[str] = None
    secondary_agent_ids: List[int] = []
    project_assistant_label: Optional[str] = None
    project_assistant_keyword: Optional[str] = None
    project_assistant_deactivate_keyword: Optional[str] = None
    project_assistant_entry_message: Optional[str] = None
    project_assistant_exit_message: Optional[str] = None


class SimulateLoadRequest(BaseModel):
    contact_count: int = 10
    sample_message: str = "Olá, gostaria de testar o suporte e a automação do sistema."
    concurrency_rate: int = 20
    respect_delay: bool = False


class WebhookConfigResponse(BaseModel):
    id: int
    name: str
    token: str
    memory_token: Optional[str]
    leads_table: str
    description: Optional[str]
    is_active: Optional[bool] = True
    disable_ai_responses: Optional[bool] = False
    delay_seconds: Optional[int] = 30
    agent_id: Optional[int] = None
    blocked_messages: Union[List[str], Any, None] = []
    allowed_contacts: Union[List[str], Any, None] = []
    zapvoice_url: Optional[str] = None
    zapvoice_api_token: Optional[str] = None
    zapvoice_client_id: Optional[str] = None
    labels_on_message: Union[List[str], Any, None] = []
    delete_keywords: Union[List[str], Any, None] = []
    delete_message: Optional[str] = None
    delete_labels: Union[List[str], Any, None] = []
    response_delay_seconds: Optional[int] = None
    split_response_enabled: Optional[bool] = True
    window_close_label: Union[List[str], Any, None] = []
    followup_enabled: Optional[bool] = None
    followup_steps: Union[List[dict], Any, None] = []
    followup_business_hours: Union[dict, Any, None] = None
    followup_cancel_label: Optional[str] = None
    followup_required_label: Optional[str] = None
    followup_add_label: Optional[str] = None
    followup_on_reply: Optional[str] = "stop"
    abandonment_delay_value: Optional[int] = 24
    abandonment_delay_unit: Optional[str] = "hours"
    purchased_label: Optional[str] = None
    memory_sync_enabled: Optional[bool] = False
    memory_phone_path: Optional[str] = "phone"
    memory_mappings: Union[List[dict], Any, None] = []
    ignore_by_label: Optional[str] = None
    negative_feedback_label: Optional[str] = None
    handoff_labels_to_add: Union[List[str], Any, None] = []
    handoff_labels_to_remove: Union[List[str], Any, None] = []
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: Union[List[str], Any, None] = []
    ai_handoff_labels_to_remove: Union[List[str], Any, None] = []
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    secondary_agent_ids: Union[List[int], Any, None] = []
    project_assistant_label: Optional[str] = None
    project_assistant_keyword: Optional[str] = None
    project_assistant_deactivate_keyword: Optional[str] = None
    project_assistant_entry_message: Optional[str] = None
    project_assistant_exit_message: Optional[str] = None
    created_at: Optional[datetime] = None

    @field_validator(
        "blocked_messages", "allowed_contacts", "labels_on_message", 
        "delete_keywords", "delete_labels", "window_close_label", "followup_steps", 
        "followup_business_hours", "memory_mappings", "handoff_labels_to_add", 
        "handoff_labels_to_remove", "ai_handoff_labels_to_add", 
        "ai_handoff_labels_to_remove", "secondary_agent_ids",
        mode="before"
    )
    @classmethod
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return v
        return v

    model_config = ConfigDict(from_attributes=True)


class WebhookConfigUpdate(BaseModel):
    name: Optional[str] = None
    leads_table: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    disable_ai_responses: Optional[bool] = None
    delay_seconds: Optional[int] = None
    agent_id: Optional[int] = None
    blocked_messages: Optional[List[str]] = None
    allowed_contacts: Optional[List[str]] = None
    zapvoice_url: Optional[str] = None
    zapvoice_api_token: Optional[str] = None
    zapvoice_client_id: Optional[str] = None
    labels_on_message: Optional[List[str]] = None
    delete_keywords: Optional[List[str]] = None
    delete_message: Optional[str] = None
    delete_labels: Optional[List[str]] = None
    response_delay_seconds: Optional[int] = None
    split_response_enabled: Optional[bool] = None
    window_close_label: Optional[List[str]] = None
    followup_enabled: Optional[bool] = None
    followup_steps: Optional[List[dict]] = None
    followup_business_hours: Optional[dict] = None
    followup_cancel_label: Optional[str] = None
    followup_required_label: Optional[str] = None
    followup_add_label: Optional[str] = None
    followup_on_reply: Optional[str] = None
    abandonment_delay_value: Optional[int] = None
    abandonment_delay_unit: Optional[str] = None
    purchased_label: Optional[str] = None
    memory_sync_enabled: Optional[bool] = None
    memory_phone_path: Optional[str] = None
    memory_name_path: Optional[str] = None
    memory_mappings: Optional[List[dict]] = None
    ignore_by_label: Optional[str] = None
    negative_feedback_label: Optional[str] = None
    handoff_labels_to_add: Optional[List[str]] = None
    handoff_labels_to_remove: Optional[List[str]] = None
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: Optional[List[str]] = None
    ai_handoff_labels_to_remove: Optional[List[str]] = None
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    token: Optional[str] = None
    memory_token: Optional[str] = None
    secondary_agent_ids: Optional[List[int]] = None
    project_assistant_label: Optional[str] = None
    project_assistant_keyword: Optional[str] = None
    project_assistant_deactivate_keyword: Optional[str] = None
    project_assistant_entry_message: Optional[str] = None
    project_assistant_exit_message: Optional[str] = None


class LeadHistoryItem(BaseModel):
    id: int
    contato_id: Optional[str]
    telefone: Optional[str]
    conteudo: str
    dono: str 
    timestamp: datetime
    index: int 


class LeadHistoryResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[LeadHistoryItem]


class BulkDeleteRequest(BaseModel):
    event_ids: List[int]


class LeadBulkDeleteRequest(BaseModel):
    lead_ids: List[int]


class WebhookEventsPaginatedResponse(BaseModel):
    total: int
    items: List[dict]


class WebhookEventResponse(BaseModel):
    id: int
    webhook_config_id: Optional[int]
    event_type: Optional[str]
    conta_id: Optional[str]
    inbox_id: Optional[str]
    inbox_nome: Optional[str]
    conversa_id: Optional[str]
    mensagem_id: Optional[str]
    contato_id: Optional[str]
    telefone: Optional[str]
    labels: Optional[str]
    contato_nome: Optional[str]
    mensagem: Optional[str]
    link: Optional[str]
    status: Optional[str]
    legenda: Optional[str]
    processing_steps: Optional[str]
    scheduled_at: Optional[datetime]
    created_at: datetime
