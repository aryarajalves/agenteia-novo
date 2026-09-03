import boto3
import os
import logging
from botocore.config import Config
from typing import Optional
import asyncio
import traceback
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL")
        self.access_key = os.getenv("S3_ACCESS_KEY")
        self.secret_key = os.getenv("S3_SECRET_KEY")
        self.bucket_name = os.getenv("S3_BUCKET_NAME")
        self.region = os.getenv("S3_REGION", "us-east-005")

        print(f"DEBUG S3: Endpoint={self.endpoint_url}")
        
        # Auto-detect region from endpoint if it's Backblaze
        if self.endpoint_url and "backblazeb2.com" in self.endpoint_url:
            parts = self.endpoint_url.replace('https://', '').replace('http://', '').split('.')
            if len(parts) > 1:
                self.region = parts[1]
                print(f"DEBUG S3: Região auto-detectada: {self.region}")

        print(f"DEBUG S3: Bucket={self.bucket_name}")
        print(f"DEBUG S3: Region Final={self.region}")
        print(f"DEBUG S3: AccessKey={'Configurada' if self.access_key else 'AUSENTE'}")

        if not all([self.endpoint_url, self.access_key, self.secret_key, self.bucket_name]):
            print("ERROR S3: Configurações incompletas no .env!")

        # Garantir que o endpoint tenha protocolo
        if self.endpoint_url and not self.endpoint_url.startswith(('http://', 'https://')):
            self.endpoint_url = f"https://{self.endpoint_url}"

        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url if self.endpoint_url else None,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            )
        )

    async def upload_file_stream(self, file_obj, s3_key: str) -> bool:
        """
        Faz o upload de um arquivo diretamente para o S3 via streaming.
        Utiliza executor para não bloquear o loop de eventos.
        """
        try:
            loop = asyncio.get_running_loop()
            # Boto3 upload_fileobj aceita um objeto file-like
            # Executamos em uma thread separada para não travar o backend async
            await loop.run_in_executor(
                None, 
                self.s3_client.upload_fileobj, 
                file_obj.file, 
                self.bucket_name, 
                s3_key
            )
            return True
        except ClientError as e:
            print(f"ERROR S3 ClientError: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
            return False
        except Exception as e:
            print(f"ERROR S3 Falha Crítica no Upload: {str(e)}")
            print(traceback.format_exc())
            return False

    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """Gera uma URL temporária para que o AssemblyAI possa baixar o arquivo."""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            logger.error(f"S3: Erro ao gerar URL assinada: {str(e)}")
            return None

    def generate_presigned_put_url(self, s3_key: str, content_type: Optional[str] = None, expiration: int = 3600) -> Optional[str]:
        """Gera uma URL temporária para que clientes façam o upload de arquivo diretamente."""
        try:
            # Para B2 e S3-compatíveis, muitas vezes é melhor NÃO assinar o Content-Type 
            # para evitar que variações de cabeçalhos no Browser (ex: video/mp4 vs application/mp4) 
            # quebrem a assinatura. 
            params = {'Bucket': self.bucket_name, 'Key': s3_key}
            
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params=params,
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            logger.error(f"S3: Erro ao gerar URL PUT assinada: {str(e)}")
            return None

    def get_public_url(self, s3_key: str) -> Optional[str]:
        """Gera presigned URL com 24h de expiração — acessível publicamente por qualquer API."""
        return self.generate_presigned_url(s3_key, expiration=86400)

    def delete_file(self, s3_key: str):
        """Remove o arquivo do bucket após o processamento."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"S3: Arquivo {s3_key} removido com sucesso.")
        except Exception as e:
            logger.error(f"S3: Erro ao deletar arquivo {s3_key}: {str(e)}")

# Instância única para reuso
s3_service = S3Service()
