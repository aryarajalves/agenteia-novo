import { useState } from 'react';
import { api } from '../../../../api/client';

export const useLoadSimulator = ({ webhook, onFinish }) => {
    const [contactCount, setContactCount] = useState(50);
    const [sampleMessage, setSampleMessage] = useState('Olá, gostaria de informações sobre o atendimento em escala.');
    const [concurrencyRate, setConcurrencyRate] = useState(20);
    const [respectDelay, setRespectDelay] = useState(false);
    
    const [simulating, setSimulating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleRunSimulation = async () => {
        setSimulating(true);
        setProgress(10);
        setErrorMsg(null);
        setResults(null);

        // Animação de progresso visual
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 15;
            });
        }, 300);

        try {
            const res = await api.post(`/webhooks/${webhook.id}/simulate-load`, {
                contact_count: Number(contactCount),
                sample_message: sampleMessage,
                concurrency_rate: Number(concurrencyRate),
                respect_delay: respectDelay
            });

            clearInterval(interval);
            const data = await res.json();

            if (res.ok && data.ok) {
                setProgress(100);
                setResults(data);
                if (onFinish) onFinish();
            } else {
                setErrorMsg(data.detail || 'Erro ao processar simulação de carga.');
            }
        } catch (err) {
            clearInterval(interval);
            console.error('Erro na simulação de carga:', err);
            setErrorMsg('Erro de conexão ao comunicar com o servidor.');
        } finally {
            setSimulating(false);
        }
    };

    return {
        contactCount,
        setContactCount,
        sampleMessage,
        setSampleMessage,
        concurrencyRate,
        setConcurrencyRate,
        respectDelay,
        setRespectDelay,
        simulating,
        progress,
        results,
        setResults,
        errorMsg,
        handleRunSimulation
    };
};
