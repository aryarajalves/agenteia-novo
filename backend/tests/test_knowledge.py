import pytest
import time
from httpx import AsyncClient

@pytest.fixture(autouse=True)
def mock_embeddings(monkeypatch):
    # Mock do get_embedding para evitar chamadas OpenAI e erro de dimensões
    async def mock_get_emb(text):
        class MockUsage:
            def __init__(self):
                self.total_tokens = 10
                self.prompt_tokens = 5
                self.completion_tokens = 5
        return [0.0] * 1536, MockUsage()

    async def mock_get_batch_emb(texts):
        class MockUsage:
            def __init__(self):
                self.total_tokens = 10
                self.prompt_tokens = 5
                self.completion_tokens = 5
        return [[0.0] * 1536 for _ in texts], MockUsage()
    
    import rag_service
    import api.routers.knowledge as knowledge_router
    monkeypatch.setattr(rag_service, "get_embedding", mock_get_emb)
    monkeypatch.setattr(knowledge_router, "get_embedding", mock_get_emb)
    monkeypatch.setattr(rag_service, "get_batch_embeddings", mock_get_batch_emb)
    monkeypatch.setattr(knowledge_router, "get_batch_embeddings", mock_get_batch_emb)

@pytest.mark.asyncio
async def test_create_knowledge_base(client: AsyncClient):
    kbid = int(time.time() + 90)
    kb_data = {
        "name": f"Test KB {kbid}",
        "description": "A knowledge base for testing."
    }
    response = await client.post("/knowledge-bases", json=kb_data)
    assert response.status_code == 200
    assert response.json()["name"] == f"Test KB {kbid}"

@pytest.mark.asyncio
async def test_add_knowledge_item(client: AsyncClient):
    kbid = int(time.time() + 100)
    # Criar KB
    kb_res = await client.post("/knowledge-bases", json={"name": f"KB for items {kbid}"})
    kb_id = kb_res.json()["id"]
    
    item_data = {
        "question": "What is unit testing?",
        "answer": "Testing small parts of code.",
        "category": "Education"
    }
    response = await client.post(f"/knowledge-bases/{kb_id}/items", json=item_data)
    assert response.status_code == 200
    assert response.json()["question"] == "What is unit testing?"

@pytest.mark.asyncio
async def test_batch_import_knowledge_items(client: AsyncClient):
    kbid = int(time.time() + 110)
    # Criar KB
    kb_res = await client.post("/knowledge-bases", json={"name": f"KB for batch {kbid}"})
    kb_id = kb_res.json()["id"]
    
    batch_data = {
        "items": [
            {"question": "Q1", "answer": "A1", "category": "Test"},
            {"question": "Q2", "answer": "A2", "category": "Test"}
        ]
    }
    response = await client.post(f"/knowledge-bases/{kb_id}/items/bulk", json=batch_data["items"])
    assert response.status_code == 200
    assert "concluded" in response.json()["message"].lower() or "synced" in response.json()["message"].lower()

@pytest.mark.asyncio
async def test_list_knowledge_bases(client: AsyncClient):
    response = await client.get("/knowledge-bases")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_find_knowledge_duplicates(client: AsyncClient):
    kbid = int(time.time() + 200)
    # 1. Criar KB
    kb_res = await client.post("/knowledge-bases", json={"name": f"KB Duplicates Test {kbid}"})
    kb_id = kb_res.json()["id"]
    
    # 2. Inserir itens (incluindo duplicatas)
    # Item 1 e 2 são duplicados (mesmo q/a)
    # Item 3 é diferente
    items = [
        {"question": "What is AI?", "answer": "Artificial Intelligence", "category": "Tech"},
        {"question": "what is ai? ", "answer": " Artificial Intelligence", "category": "Tech"}, # Variação de case/espaço
        {"question": "How to train?", "answer": "With data.", "category": "Tech"}
    ]
    
    for item in items:
        await client.post(f"/knowledge-bases/{kb_id}/items", json=item)
        
    # 3. Chamar endpoint de duplicados
    response = await client.get(f"/knowledge-bases/{kb_id}/duplicates")
    assert response.status_code == 200
    data = response.json()
    
    assert "duplicates" in data
    # Deve encontrar 1 grupo de duplicados (as 2 variações de 'What is AI?')
    assert len(data["duplicates"]) == 1
    assert data["duplicates"][0]["count"] == 2
    assert len(data["duplicates"][0]["ids"]) == 2

@pytest.mark.asyncio
async def test_find_semantic_duplicates(client: AsyncClient):
    kbid = int(time.time() + 300)
    kb_res = await client.post("/knowledge-bases", json={"name": f"KB Semantic Test {kbid}"})
    kb_id = kb_res.json()["id"]
    
    # Adiciona dois itens que serão "semanticamente idênticos" porque o mock retorna zeros para ambos
    await client.post(f"/knowledge-bases/{kb_id}/items", json={"question": "Carros voam?", "answer": "Não."})
    await client.post(f"/knowledge-bases/{kb_id}/items", json={"question": "Veículos aéreos?", "answer": "Sim."})
    
    # Chama com ?semantic=true
    response = await client.get(f"/knowledge-bases/{kb_id}/duplicates?semantic=true")
    assert response.status_code == 200
    data = response.json()
    
    # Devem ser agrupados (pela similaridade de vetores iguais no mock)
    assert len(data["duplicates"]) >= 1
    assert data["duplicates"][0]["is_semantic"] is True

@pytest.mark.asyncio
async def test_propose_merge(client: AsyncClient, monkeypatch):
    # 1. Mock do LLM para a mesclagem
    async def mock_call_llm(*args, **kwargs):
        class MockChoice:
            def __init__(self):
                self.message = type('obj', (object,), {'content': '{"question": "Mesclado", "answer": "Tudo junto"}'})
        class MockResponse:
            def __init__(self):
                self.choices = [MockChoice()]
        return MockResponse()

    import rag_service
    monkeypatch.setattr(rag_service, "call_rag_llm", mock_call_llm)
    
    kbid = int(time.time() + 400)
    kb_res = await client.post("/knowledge-bases", json={"name": f"Merge Test {kbid}"})
    kb_id = kb_res.json()["id"]
    
    res1 = await client.post(f"/knowledge-bases/{kb_id}/items", json={"question": "A", "answer": "1"})
    res2 = await client.post(f"/knowledge-bases/{kb_id}/items", json={"question": "B", "answer": "2"})
    
    ids = [res1.json()["id"], res2.json()["id"]]
    
    merge_res = await client.post(f"/knowledge-bases/{kb_id}/propose-merge", json={"item_ids": ids})
    assert merge_res.status_code == 200
    assert merge_res.json()["proposed"]["question"] == "Mesclado"

@pytest.mark.asyncio
async def test_export_knowledge_base(client: AsyncClient):
    kbid = int(time.time() + 500)
    kb_res = await client.post("/knowledge-bases", json={"name": f"Export Test {kbid}", "description": "Export test desc"})
    kb_id = kb_res.json()["id"]
    await client.post(f"/knowledge-bases/{kb_id}/items", json={"question": "Q Export", "answer": "A Export", "category": "Test"})
    
    export_res = await client.get(f"/knowledge-bases/{kb_id}/export")
    assert export_res.status_code == 200
    data = export_res.json()
    assert data["name"] == f"Export Test {kbid}"
    assert len(data["items"]) == 1
    assert data["items"][0]["question"] == "Q Export"

@pytest.mark.asyncio
async def test_import_knowledge_base_items(client: AsyncClient):
    kbid = int(time.time() + 600)
    kb_res = await client.post("/knowledge-bases", json={"name": f"Import Items Test {kbid}"})
    kb_id = kb_res.json()["id"]
    
    payload = {
        "items": [
            {"question": "Imp Q1", "answer": "Imp A1", "category": "General"},
            {"question": "Imp Q2", "answer": "Imp A2", "category": "General"}
        ]
    }
    import_res = await client.post(f"/knowledge-bases/{kb_id}/import", json=payload)
    assert import_res.status_code == 200
    assert import_res.json()["imported_count"] == 2

@pytest.mark.asyncio
async def test_import_new_knowledge_base(client: AsyncClient):
    import json
    import io
    kbid = int(time.time() + 700)
    json_data = {
        "name": f"New Base Import {kbid}",
        "description": "Imported KB description",
        "kb_type": "qa",
        "items": [
            {"question": "New KB Q1", "answer": "New KB A1", "category": "NewCat"}
        ]
    }
    file_bytes = json.dumps(json_data).encode("utf-8")
    files = {"file": ("test_import.json", io.BytesIO(file_bytes), "application/json")}
    res = await client.post("/knowledge-bases/import-new", files=files)
    assert res.status_code == 200
    res_json = res.json()
    assert res_json["name"] == f"New Base Import {kbid}"
    assert len(res_json["items"]) == 1
    assert res_json["items"][0]["question"] == "New KB Q1"

