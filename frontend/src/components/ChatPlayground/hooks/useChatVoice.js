import { useRef, useState } from 'react';
import { api } from '../../../api/client';

export const useChatVoice = ({ setInput, showToast, setLoading, onSendMessage }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const speechRecognitionRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleVoiceRecord = async () => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (speechRecognitionRef.current) {
                speechRecognitionRef.current.stop();
                speechRecognitionRef.current = null;
            }
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunksRef.current = [];
                
                const types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav'];
                const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
                const options = mimeType ? { mimeType } : {};
                const mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(track => track.stop());

                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                    audioChunksRef.current = [];

                    setLoading(true);
                    showToast("Transcrevendo áudio...", "info");

                    try {
                        const formData = new FormData();
                        const fileExtension = mimeType.includes('webm') ? 'webm' : (mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mp4') ? 'mp4' : 'webm'));
                        formData.append('file', audioBlob, `recording.${fileExtension}`);

                        const response = await api.upload('/transcribe-audio', formData);
                        if (!response.ok) {
                            const errText = await response.text();
                            throw new Error(`Erro ${response.status}: ${errText}`);
                        }

                        const data = await response.json();
                        if (data.text && data.text.trim()) {
                            showToast("Áudio transcrito com sucesso!", "success");
                            setInput('');
                            if (onSendMessage) {
                                await onSendMessage(null, data.text);
                            }
                        } else {
                            showToast("Nenhuma fala detectada no áudio.", "warning");
                            setLoading(false);
                        }
                    } catch (err) {
                        console.error("Erro ao transcrever áudio:", err);
                        showToast(`Falha ao transcrever áudio: ${err.message}`, "error");
                        setLoading(false);
                    }
                };

                // Configura e inicia a transcrição em tempo real via Web Speech API
                setInput('');
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'pt-BR';

                    recognition.onresult = (event) => {
                        let interimTranscript = '';
                        let finalTranscript = '';

                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTranscript += event.results[i][0].transcript;
                            } else {
                                interimTranscript += event.results[i][0].transcript;
                            }
                        }

                        const transcript = finalTranscript + interimTranscript;
                        if (transcript.trim()) {
                            setInput(transcript);
                        }
                    };

                    recognition.onerror = (event) => {
                        console.warn("Speech recognition warning/error:", event.error);
                    };

                    speechRecognitionRef.current = recognition;
                    recognition.start();
                }

                mediaRecorder.start();
                setIsRecording(true);
                showToast("Gravando áudio...", "info");
            } catch (err) {
                console.error("Erro ao acessar microfone:", err);
                showToast("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.", "error");
            }
        }
    };

    const stopRecordingCleanup = () => {
        if (isRecording) {
            if (mediaRecorderRef.current) {
                const stream = mediaRecorderRef.current.stream;
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                mediaRecorderRef.current.onstop = null;
                if (mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
            }
            if (speechRecognitionRef.current) {
                speechRecognitionRef.current.stop();
                speechRecognitionRef.current = null;
            }
            setIsRecording(false);
        }
    };

    return {
        isRecording,
        setIsRecording,
        handleVoiceRecord,
        stopRecordingCleanup,
        mediaRecorderRef,
        speechRecognitionRef,
        audioChunksRef
    };
};
