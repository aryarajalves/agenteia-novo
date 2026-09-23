import io
import os
import asyncio
import logging
import boto3
import pandas as pd
from typing import Dict, Any

from s3_service import s3_service
from database import async_session
from models import TranscriptionTaskModel

logger = logging.getLogger(__name__)


async def extract_text_from_pdf(content: bytes) -> str:
    """Extrai texto de arquivo PDF utilizando pdfplumber."""
    import pdfplumber
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


async def extract_text_from_docx(content: bytes) -> str:
    """Extrai texto de documento DOCX."""
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join([p.text for p in doc.paragraphs])


async def background_s3_upload(local_path: str, s3_key: str, task_id: int, config_dict: dict):
    """Executa upload assíncrono para o storage S3 e enfileira tarefa Celery."""
    try:
        from tasks import process_transcription_task
        logger.info(f"BACKGROUND: Iniciando upload para S3 de {local_path} -> {s3_key}")
        
        loop = asyncio.get_running_loop()
        def do_upload():
            s3_client = boto3.client(
                's3',
                endpoint_url=s3_service.endpoint_url,
                aws_access_key_id=s3_service.access_key,
                aws_secret_access_key=s3_service.secret_key,
                region_name=s3_service.region
            )
            s3_client.upload_file(local_path, s3_service.bucket_name, s3_key)
            
        await loop.run_in_executor(None, do_upload)
        logger.info(f"BACKGROUND: Upload S3 concluído. Disparando Celery para task_id={task_id}")
        process_transcription_task.delay(task_id, s3_key, config_dict)
        
    except Exception as e:
        logger.error(f"Erro no background S3 upload: {e}", exc_info=True)
        async with async_session() as db:
            task = await db.get(TranscriptionTaskModel, task_id)
            if task:
                task.status = "FAILURE"
                task.error_message = f"Falha no upload para storage: {str(e)}"
                await db.commit()
    finally:
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as rme:
                logger.error(f"Não conseguiu excluir temp local {local_path}: {rme}")


def analyze_kb_file_content(content: bytes, filename: str) -> Dict[str, Any]:
    """Analisa arquivo tabular, PDF ou imagem para visualização prévia na base."""
    filename = filename.lower()
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".pdf"):
            return {"page_count": 0, "is_pdf": True, "is_image": False}
        elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
            return {"page_count": 1, "is_pdf": False, "is_image": True}
        else:
            return {"error": "Formato não suportado"}
        return {
            "columns": df.columns.tolist(),
            "preview": df.head(5).to_dict(orient="records"),
            "total_rows": len(df)
        }
    except Exception as e:
        return {"error": str(e)}


def analyze_kb_text_content(text: str) -> Dict[str, Any]:
    """Analisa amostra de texto tabular CSV para pré-visualização."""
    try:
        df = pd.read_csv(io.StringIO(text), sep=',', nrows=5)
        return {
            "columns": df.columns.tolist(),
            "preview": df.head(5).to_dict(orient="records"),
            "total_rows": 5
        }
    except Exception:
        return {"error": "Falha ao analisar texto"}
