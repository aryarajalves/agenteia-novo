import React, { useState, useEffect } from 'react';
import { usePipelineEvent } from './hooks/usePipelineEvent';
import { useUserMessagesNavigation } from './hooks/useUserMessagesNavigation';
import { parsePipelineSteps, calculatePipelineMetrics } from './utils/pipelineHelpers';
import PipelineHeader from './components/PipelineHeader';
import PipelineSummaryBar from './components/PipelineSummaryBar';
import PipelineActionToolbar from './components/PipelineActionToolbar';
import PipelineFilterBar from './components/PipelineFilterBar';
import PipelineLoadingState from './components/PipelineLoadingState';
import PipelineDebounceCard from './components/PipelineDebounceCard';
import PipelineStepCard from './components/PipelineStepCard';
import PipelineProcessingStatus from './components/PipelineProcessingStatus';
import PipelineMaximizedModal from './components/PipelineMaximizedModal';
import ImageLightboxModal from './components/ImageLightboxModal';

const AutomationPipelineModal = ({
    event: initialEvent,
    webhookId,
    onClose,
    events: eventsProp = null,
    onNavigateEvent = null
}) => {
    const [activeEvent, setActiveEvent] = useState(initialEvent);
    const [maximizedStep, setMaximizedStep] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAllCollapsed, setIsAllCollapsed] = useState(false);

    // Sincronizar activeEvent se initialEvent mudar via prop
    useEffect(() => {
        if (initialEvent && initialEvent.id !== activeEvent?.id) {
            setActiveEvent(initialEvent);
        }
    }, [initialEvent]);

    const handleNavigate = (newEvent) => {
        setActiveEvent(newEvent);
        if (onNavigateEvent) {
            onNavigateEvent(newEvent);
        }
    };

    const navigation = useUserMessagesNavigation(
        activeEvent,
        webhookId,
        eventsProp,
        handleNavigate
    );

    const {
        event,
        loading,
        initialLoading,
        isNavigating,
        isTimeout,
        pollEvent,
        handleManualRefresh
    } = usePipelineEvent(activeEvent, webhookId);

    const timelineScrollRef = React.useRef(null);

    // Resetar o scroll suavemente para o topo ao alternar mensagens
    useEffect(() => {
        if (timelineScrollRef.current) {
            timelineScrollRef.current.scrollTop = 0;
        }
    }, [event?.id]);

    const steps = parsePipelineSteps(event);
    const metrics = calculatePipelineMetrics(steps, event);

    const searchClean = searchTerm.trim().toLowerCase();
    const filteredSteps = steps.filter(step => {
        if (selectedCategory !== 'all') {
            if (selectedCategory === 'cache') {
                if (!step.isSemanticCache && !step.title?.includes('Cache Semântico')) return false;
            } else if (step.category !== selectedCategory) {
                return false;
            }
        }
        if (!searchClean) return true;

        const titleMatch = (step.title || '').toLowerCase().includes(searchClean);
        const contentMatch = (step.content || '').toLowerCase().includes(searchClean);
        const detailMatch = typeof step.detail === 'string'
            ? step.detail.toLowerCase().includes(searchClean)
            : JSON.stringify(step.detail || '').toLowerCase().includes(searchClean);
        const categoryMatch = (step.category || '').toLowerCase().includes(searchClean);

        return titleMatch || contentMatch || detailMatch || categoryMatch;
    });

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1100 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                @keyframes pulseCard {
                    0% { border-color: rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.05); }
                    50% { border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.09); }
                    100% { border-color: rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.05); }
                }
                .pipeline-spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(99, 102, 241, 0.1);
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    flex-shrink: 0;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            ` }} />
            <div
                onClick={e => e.stopPropagation()}
                className="premium-modal-content"
                style={{ maxWidth: '1120px', width: '96%', borderRadius: '32px', padding: '2rem', height: '88vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Cabeçalho do Pipeline com Identificação do Lead e Navegação entre Mensagens */}
                <PipelineHeader
                    createdAt={event.created_at}
                    event={event}
                    loading={loading}
                    onRefresh={handleManualRefresh}
                    onClose={onClose}
                    hasPrevious={navigation.hasPrevious}
                    hasNext={navigation.hasNext}
                    isLastMessage={navigation.isLastMessage}
                    currentIndex={navigation.currentIndex}
                    totalMessages={navigation.totalMessages}
                    onPrevious={navigation.goToPrevious}
                    onNext={navigation.goToNext}
                    loadingMessages={navigation.loadingMessages || isNavigating}
                />

                {/* Timeline Scrollable Area */}
                {initialLoading && !event?.id ? (
                    <PipelineLoadingState />
                ) : (
                    <div 
                        ref={timelineScrollRef}
                        style={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            paddingRight: '0.75rem',
                            marginRight: '-0.75rem',
                            paddingBottom: '2rem',
                            opacity: isNavigating ? 0.72 : 1,
                            transition: 'opacity 0.15s ease'
                        }} 
                        className="custom-scrollbar"
                    >
                        {/* Barra de progresso suave no topo durante navegação rápida */}
                        {isNavigating && (
                            <div style={{
                                position: 'sticky',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                background: 'linear-gradient(90deg, #6366f1, #a855f7, #38bdf8)',
                                backgroundSize: '200% 100%',
                                animation: 'pulse 1s infinite linear',
                                zIndex: 30,
                                borderRadius: '4px',
                                marginBottom: '10px'
                            }} />
                        )}
                        {/* Barra de Resumo de Métricas (Latência, Tokens, Custos, Status) */}
                        <PipelineSummaryBar metrics={metrics} />

                        {/* Barra de Ações Rápidas (Reprocessar / Copiar JSON / Recolher Todos) */}
                        <PipelineActionToolbar
                            event={event}
                            webhookId={webhookId}
                            steps={steps}
                            metrics={metrics}
                            onRefresh={handleManualRefresh}
                            isAllCollapsed={isAllCollapsed}
                            onToggleCollapseAll={() => setIsAllCollapsed(!isAllCollapsed)}
                        />

                        {/* Barra de Filtros por Categoria e Busca Rápida */}
                        <PipelineFilterBar
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            counts={metrics.categoryCounts}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            totalVisibleSteps={filteredSteps.length}
                            totalSteps={steps.length}
                        />

                        <div style={{ position: 'relative', paddingLeft: '3rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {/* Linha da Timeline */}
                            <div style={{ 
                                position: 'absolute', left: '14px', top: '10px', bottom: '10px', width: '2px', 
                                background: 'linear-gradient(to bottom, #6366f1 0%, rgba(99, 102, 241, 0.1) 100%)',
                                boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
                            }} />

                            {/* Estado de Espera (Debounce) */}
                            {selectedCategory === 'all' && (
                                <PipelineDebounceCard
                                    event={event}
                                    onFinished={pollEvent}
                                />
                            )}

                            {/* Passos Filtrados da Timeline */}
                            {filteredSteps.map((step) => (
                                <PipelineStepCard
                                    key={step.id}
                                    step={step}
                                    eventId={event?.id}
                                    isAllCollapsed={isAllCollapsed}
                                    onMaximize={setMaximizedStep}
                                    onOpenImage={setLightboxImage}
                                />
                            ))}

                            {filteredSteps.length === 0 && (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                                    borderRadius: '16px',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    color: '#94a3b8',
                                    fontSize: '0.85rem'
                                }}>
                                    Nenhum passo registrado nesta categoria para este evento.
                                </div>
                            )}

                            {/* Indicador de Automação em Andamento / Timeout */}
                            {selectedCategory === 'all' && (
                                <PipelineProcessingStatus
                                    status={event.status}
                                    isTimeout={isTimeout}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Modal Maximizado (Overlay Secundário) */}
                <PipelineMaximizedModal
                    maximizedStep={maximizedStep}
                    onClose={() => setMaximizedStep(null)}
                />

                {/* Modal de Imagem Ampliada (Lightbox) */}
                {lightboxImage && (
                    <ImageLightboxModal
                        imageUrl={lightboxImage}
                        onClose={() => setLightboxImage(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default AutomationPipelineModal;

