import os
import httpx
import logging
import base64
import subprocess
import tempfile
from openai import AsyncOpenAI
from core.timezone import get_now_br

logger = logging.getLogger(__name__)

async def _convert_to_mp3(audio_data: bytes) -> bytes:
    """Converte áudio para MP3 (64kbps, Mono) usando ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".tmp", delete=False) as f_in:
        f_in.write(audio_data)
        in_path = f_in.name
    
    out_path = in_path + ".mp3"
    try:
        # Comando para converter para MP3 (formato amplamente aceito)
        cmd = [
            "ffmpeg", "-y", "-i", in_path, 
            "-codec:a", "libmp3lame", "-b:a", "64k", "-ac", "1", 
            out_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"Erro no ffmpeg: {result.stderr}")
            raise Exception(f"ffmpeg falhou: {result.stderr}")
            
        with open(out_path, "rb") as f_out:
            data = f_out.read()
            logger.info(f"✅ Áudio convertido para MP3: {len(data)} bytes")
            return data
    finally:
        if os.path.exists(in_path): os.remove(in_path)
        if os.path.exists(out_path): os.remove(out_path)


def is_conversational_hallucination(text: str) -> bool:
    """Verifica se o texto retornado parece ser uma resposta de chat conversacional em vez de uma transcrição literal."""
    lowered = text.lower().strip()
    # Frases típicas de assistentes que se oferecem para transcrever ou pedem o arquivo
    indicators = [
        "compartilhe o áudio",
        "compartilhe o audio",
        "envie o arquivo",
        "envie o áudio",
        "envie o audio",
        "gostaria que eu transcreva",
        "gostaria que eu transcrevesse",
        "você pode me enviar",
        "voce pode me enviar",
        "claro, por favor",
        "claro! por favor",
        "claro, envie",
        "como posso ajudar",
        "posso ajudar",
        "não contêm áudio",
        "não há áudio",
        "não foi possível transcrever",
        "áudio não fornecido",
        "insira o áudio",
        "insira o audio",
        "por favor, envie",
        "por favor envie"
    ]
    for ind in indicators:
        if ind in lowered:
            return True
    return False



async def process_media_content(url: str, message_type: str, api_key: str, chatwoot_token: str = None) -> dict:
    """
    Faz o download da mídia e processa usando GPT-4o (Vision ou Audio).
    Retorna um dicionário com o texto extraído e metadados.
    """
    if not api_key:
        return {"error": "API Key da OpenAI não configurada", "text": ""}

    client = AsyncOpenAI(api_key=api_key)
    
    try:
        # 1. Download da Mídia
        headers = {}
        if chatwoot_token:
            headers["api_access_token"] = chatwoot_token

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as http_client:
            resp = await http_client.get(url, headers=headers)
            if resp.status_code != 200:
                return {"error": f"Erro ao baixar mídia: {resp.status_code}", "text": ""}
            media_data = resp.content

        # 2. Processamento por Tipo
        if message_type == "audio":
            logger.info(f"🎙️ Iniciando transcrição de áudio via Whisper-1 como principal...")
            
            # Converter para MP3 para garantir compatibilidade
            try:
                converted_audio = await _convert_to_mp3(media_data)
            except Exception as conv_err:
                logger.error(f"Falha na conversão de áudio: {conv_err}")
                return {"error": f"Erro ao processar áudio: {conv_err}", "text": ""}
            
            gpt_audio_success = False
            raw_text = ""
            
            # 1. Tentar gpt-4o-audio-preview primeiro (Multimodal Chat)
            try:
                audio_b64 = base64.b64encode(converted_audio).decode('utf-8')
                logger.info(f"📤 Enviando áudio (Base64 length: {len(audio_b64)}) para gpt-4o-audio-preview...")
                
                response = await client.chat.completions.create(
                    model="gpt-4o-audio-preview",
                    modalities=["text"],
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Você é um transcritor automático de áudio extremamente fiel. "
                                "Sua única tarefa é ouvir o áudio fornecido e transcrever exatamente o que é falado, "
                                "sem adicionar saudações, explicações, comentários ou formatações conversacionais de bate-papo. "
                                "Se o áudio contiver apenas silêncio ou ruído, responda com uma string vazia."
                            )
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "input_audio",
                                    "input_audio": {
                                        "data": audio_b64,
                                        "format": "mp3"
                                    }
                                }
                            ]
                        }
                    ]
                )
                
                raw_text = response.choices[0].message.content or ""
                
                # Validar se o texto retornado não é uma alucinação conversacional
                if is_conversational_hallucination(raw_text):
                    logger.warning(f"🚫 Detectada alucinação conversacional do gpt-4o-audio-preview: '{raw_text}'. Descartando resultado.")
                    raise Exception("O gpt-4o-audio-preview gerou uma resposta conversacional em vez de uma transcrição fiel.")
                
                gpt_audio_success = True
                logger.info(f"✅ Transcrição obtida com sucesso via gpt-4o-audio-preview")
                return {
                    "text": raw_text.strip(),
                    "model": "gpt-4o-audio-preview",
                    "usage": response.usage.to_dict() if hasattr(response, 'usage') else {}
                }
            except Exception as gpt_audio_err:
                logger.warning(f"⚠️ Falha na transcrição via gpt-4o-audio-preview: {gpt_audio_err}. Iniciando fallback para Whisper-1...")
            
            # 2. Fallback para Whisper-1 (ASR dedicado)
            if not gpt_audio_success:
                temp_audio_path = None
                try:
                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file:
                        temp_audio_file.write(converted_audio)
                        temp_audio_path = temp_audio_file.name
                    
                    logger.info(f"📤 Enviando áudio para Whisper-1...")
                    with open(temp_audio_path, "rb") as audio_file:
                        transcript = await client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            response_format="json",
                            prompt="Transcrição fiel do áudio no idioma original. Mantenha a pontuação natural."
                        )
                    
                    transcription = transcript.text.strip()
                    
                    # Filtro contra alucinações comuns do Whisper em áudios silenciosos
                    hallucinations = [
                        "Thank you.", "Thank you", "Thanks for watching.", "Keep watching", 
                        "Subscribe to my channel", "Please subscribe", "We feel lucky", "I'll see you in the next one"
                    ]
                    if transcription in hallucinations or len(transcription) < 2:
                        logger.info(f"🚫 Alucinação detectada e filtrada no Whisper: '{transcription}'")
                        transcription = ""
                    
                    logger.info(f"✅ Transcrição obtida via fallback Whisper-1")
                    return {
                        "text": transcription,
                        "model": "whisper-1",
                        "usage": {}
                    }
                except Exception as whisper_err:
                    logger.error(f"❌ Falha crítica: gpt-4o-audio-preview e Whisper-1 falharam. Erro Whisper-1: {whisper_err}")
                    return {"error": f"Erro na transcrição de áudio: {whisper_err}", "text": ""}
                finally:
                    if temp_audio_path and os.path.exists(temp_audio_path):
                        try:
                            os.remove(temp_audio_path)
                        except Exception as rm_err:
                            logger.error(f"Não foi possível remover arquivo temporário {temp_audio_path}: {rm_err}")

        elif message_type == "image":
            logger.info(f"🖼️ Iniciando análise de imagem via GPT-4o-Vision...")
            
            # Codificar imagem em base64
            image_b64 = base64.b64encode(media_data).decode('utf-8')
            
            vision_prompt = (
                "Você é um especialista em análise visual para um assistente inteligente de atendimento, suporte e vendas no WhatsApp.\n"
                "Sua função é analisar a imagem enviada pelo cliente e extrair os dados e o contexto de forma estruturada e precisa, "
                "permitindo que o assistente de IA converse diretamente com o cliente em 1ª pessoa no WhatsApp com total clareza.\n\n"
                "Classifique e formate a descrição no seguinte padrão:\n\n"
                "- TIPO DE IMAGEM: [Comprovante de Pagamento/PIX, Foto de Produto/Equipamento/Defeito, Print de Erro/Dúvida Técnica, Anúncio/Criativo de Marketing, ou Imagem Geral]\n\n"
                "Se for COMPROVANTE DE PAGAMENTO / PIX / TRANSFERÊNCIA:\n"
                "  • VALOR: [R$ Valor identificado no comprovante]\n"
                "  • FAVORECIDO / BENEFICIÁRIO: [Nome de quem recebeu o pagamento]\n"
                "  • PAGADOR: [Nome do pagador, se visível]\n"
                "  • DATA E HORA: [Data e horário da transação]\n"
                "  • AUTENTICAÇÃO / ID: [Código de autenticação, ID da transação ou protocolo]\n"
                "  • STATUS VISÍVEL: [Confirmado / Processando / Agendado / Falha]\n"
                "  • ORIENTAÇÃO AO AGENTE: Confirmar o recebimento do comprovante com o cliente, citar o valor/favorecido de forma transparente e informar que o pagamento está sendo validado/liberado.\n\n"
                "Se for FOTO DE PRODUTO / EQUIPAMENTO / DEFEITO:\n"
                "  • PRODUTO / PEÇA: [Identificação do produto ou equipamento visível]\n"
                "  • MARCA / MODELO: [Marca ou modelo se estiver visível no rótulo/chassi]\n"
                "  • ESTADO / DEFEITO VISÍVEL: [Descrição visual do estado, avaria, desgaste ou peça em questão]\n"
                "  • ORIENTAÇÃO AO AGENTE: Acolher o cliente de forma consultiva, confirmar o produto/problema observado e perguntar como pode ajudar.\n\n"
                "Se for PRINT DE ERRO / DÚVIDA TÉCNICA:\n"
                "  • MENSAGEM DE ERRO EXATA: [Transcreva o texto exato da mensagem de erro ou aviso exibido na tela]\n"
                "  • SISTEMA / TELA: [Qual sistema, aplicativo ou tela está aberta]\n"
                "  • ORIENTAÇÃO AO AGENTE: Explicar o motivo do erro com empatia e fornecer o passo a passo ou orientação de suporte para resolução.\n\n"
                "Se for ANÚNCIO / CRIATIVO DE MARKETING:\n"
                "  • TEMA / HEADLINE PRINCIPAL: [O texto, manchete ou gancho em destaque no anúncio]\n"
                "  • OFERTA / PROMESSA: [Resumo do produto/serviço ofertado]\n"
                "  • ORIENTAÇÃO AO AGENTE: Puxar conversa amigável e consultiva sobre o tema do criativo em 1ª pessoa, sem forçar venda imediata.\n\n"
                "Se for IMAGEM GERAL:\n"
                "  • DESCRIÇÃO DOS ELEMENTOS: [Resumo objetivo do que está visível]\n"
                "  • ORIENTAÇÃO AO AGENTE: Responder com cordialidade referenciando a imagem recebida.\n\n"
                "NUNCA fale em 3ª pessoa ou aja como copiloto/assistente interno. O assistente usará esses dados para falar diretamente com o cliente."
            )
            
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": vision_prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
                            }
                        ]
                    }
                ],
                max_tokens=500
            )
            
            description = response.choices[0].message.content or ""
            return {
                "text": description,
                "model": "gpt-4o",
                "usage": response.usage.to_dict() if hasattr(response, 'usage') else {}
            }

        return {"error": "Tipo de mídia não suportado", "text": ""}

    except Exception as e:
        logger.error(f"Erro no processamento de mídia: {e}")
        return {"error": str(e), "text": ""}
