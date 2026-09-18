import pytest
from models import AgentConfigModel
from config_store import AgentConfig as ConfigStoreAgentConfig
from api.schemas import AgentConfig as SchemaAgentConfig

def test_models_rag_defaults():
    col_multi = AgentConfigModel.__table__.columns['rag_multi_query_enabled']
    col_parent = AgentConfigModel.__table__.columns['rag_parent_expansion_enabled']
    assert col_multi.default.arg is True
    assert col_parent.default.arg is False

def test_config_store_rag_defaults():
    cfg = ConfigStoreAgentConfig()
    assert cfg.rag_multi_query_enabled is True
    assert cfg.rag_parent_expansion_enabled is False

def test_schemas_rag_defaults():
    schema = SchemaAgentConfig(name="Teste", model="gpt-4o-mini")
    assert schema.rag_multi_query_enabled is True
    assert schema.rag_parent_expansion_enabled is False
