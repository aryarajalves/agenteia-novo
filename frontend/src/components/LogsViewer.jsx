import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { LEVELS } from './LogsViewerModules/constants';
import { LogsActionBar, LogsFilterBar, LogsTable, LogsPasteModal } from './LogsViewerModules';

const LogsViewer = () => {
    const [containers, setContainers] = useState([]);
    const [selectedContainers, setSelectedContainers] = useState([]);
    const [tail, setTail] = useState(2000);

    // Seletor de dia (dropdown com os dias que realmente possuem log)
    const [availableDays, setAvailableDays] = useState([]);
    const [totalLogCount, setTotalLogCount] = useState(0);
    const [selectedDay, setSelectedDay] = useState(null); // null = "Últimas N linhas"
    const [dayPickerOpen, setDayPickerOpen] = useState(false);
    const dayPickerRef = useRef(null);

    const [timeFrom, setTimeFrom] = useState('');
    const [timeTo, setTimeTo] = useState('');
    const [search, setSearch] = useState('');
    const [searchTerms, setSearchTerms] = useState([]);
    const [activeLevels, setActiveLevels] = useState([]);
    const [activeTags, setActiveTags] = useState([]);
    const [quickFilters, setQuickFilters] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDays, setLoadingDays] = useState(false);
    const [errors, setErrors] = useState([]);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const [pageSize, setPageSize] = useState(1000);
    const [currentPage, setCurrentPage] = useState(1);

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
    };

    const fetchContainers = useCallback(async () => {
        try {
            const response = await api.get('/logs/containers');
            if (response.ok) {
                const data = await response.json();
                setContainers(data);
            }
        } catch (error) {
            console.error('Erro ao listar containers:', error);
        }
    }, []);

    const fetchAvailableDays = useCallback(async () => {
        setLoadingDays(true);
        try {
            const response = await api.get('/logs/days');
            if (response.ok) {
                const data = await response.json();
                setAvailableDays(data.days || []);
                setTotalLogCount(data.total_count || 0);
            }
        } catch (error) {
            console.error('Erro ao buscar dias disponíveis:', error);
        } finally {
            setLoadingDays(false);
        }
    }, []);

    useEffect(() => {
        fetchContainers();
        fetchAvailableDays();
    }, [fetchContainers, fetchAvailableDays]);

    // Fecha o dropdown de dias ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dayPickerRef.current && !dayPickerRef.current.contains(e.target)) {
                setDayPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleLevel = (lvl) => {
        setActiveLevels((prev) => prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]);
    };

    const toggleTag = (tagKey) => {
        setActiveTags((prev) => prev.includes(tagKey) ? prev.filter((t) => t !== tagKey) : [...prev, tagKey]);
    };

    const toggleContainer = (name) => {
        setSelectedContainers((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]);
    };

    const handleLoadLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedContainers.length > 0) params.set('containers', selectedContainers.join(','));
            params.set('tail', String(tail));
            if (selectedDay) params.set('day', selectedDay);
            if (selectedDay && timeFrom) params.set('time_from', timeFrom);
            if (selectedDay && timeTo) params.set('time_to', timeTo);
            if (activeLevels.length > 0) params.set('level', activeLevels.join(','));
            if (activeTags.length > 0) params.set('tag', activeTags.join(','));
            if (search.trim()) params.set('search', search.trim());

            const response = await api.get(`/logs?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || []);
                setQuickFilters(data.quick_filters || []);
                setErrors(data.errors || []);
                if ((data.errors || []).length > 0) {
                    showToast(`Alguns containers não puderam ser lidos (${data.errors.length}).`, 'error');
                }
            } else {
                const err = await response.json().catch(() => ({}));
                showToast(err.detail || 'Erro ao carregar logs.', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            showToast('Erro de conexão ao carregar logs.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Recarrega automaticamente quando o usuário muda containers, dia ou horário
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            handleLoadLogs();
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedContainers, selectedDay, timeFrom, timeTo]);

    const handlePasteManually = () => {
        const lines = pastedText.split('\n').filter((l) => l.trim());
        const re = /^(\d{2,4}[-/]\d{2}[-/]\d{2,4}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s*-\s*([\w.\-/]+)\s*-\s*(CRITICAL|ERROR|WARNING|WARN|INFO|DEBUG)\s*-\s*(.*)$/;
        const parsed = lines.map((line, idx) => {
            const match = line.trim().match(re);
            if (match) {
                let level = match[3].toUpperCase();
                if (level === 'WARN') level = 'WARNING';
                return {
                    id: `pasted-${idx}`,
                    container: 'colado-manualmente',
                    timestamp_display: match[1],
                    logger: match[2],
                    level,
                    message: match[4],
                    raw: line,
                    tags: [],
                };
            }
            return {
                id: `pasted-${idx}`,
                container: 'colado-manualmente',
                timestamp_display: '--',
                logger: 'colado-manualmente',
                level: 'INFO',
                message: line,
                raw: line,
                tags: [],
            };
        });
        setLogs(parsed);
        setErrors([]);
        setShowPasteModal(false);
        setPastedText('');
        showToast(`${parsed.length} linha(s) coladas e analisadas.`, 'success');
    };

    const handleClearView = () => {
        setLogs([]);
        setErrors([]);
    };

    const handleCopy = () => {
        const text = filteredLogs.map((l) => l.raw).join('\n');
        navigator.clipboard.writeText(text);
        showToast(`${filteredLogs.length.toLocaleString('pt-BR')} linha(s) copiada(s) para a área de transferência.`, 'success');
    };

    const handleDownload = () => {
        const text = filteredLogs.map((l) => l.raw).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSelectDay = (dateKey) => {
        setSelectedDay(dateKey);
        setDayPickerOpen(false);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        const term = search.trim().toLowerCase();
        if (!term) return;
        setSearchTerms((prev) => prev.includes(term) ? prev : [...prev, term]);
        setSearch('');
    };

    const removeSearchTerm = (term) => {
        setSearchTerms((prev) => prev.filter((t) => t !== term));
    };

    // Filtro local adicional
    const filteredLogs = useMemo(() => {
        const liveTerm = search.trim().toLowerCase();
        const allTerms = liveTerm ? [...searchTerms, liveTerm] : searchTerms;
        return logs.filter((l) => {
            if (activeLevels.length > 0 && !activeLevels.includes(l.level)) return false;
            const haystack = `${l.message} ${l.logger}`.toLowerCase();
            if (allTerms.length > 0 && !allTerms.every((term) => haystack.includes(term))) return false;
            return true;
        });
    }, [logs, activeLevels, search, searchTerms]);

    // Contadores de nível derivados dos logs carregados
    const levelCounts = useMemo(() => {
        const counts = LEVELS.reduce((acc, lv) => ({ ...acc, [lv]: 0 }), {});
        logs.forEach((l) => {
            if (counts[l.level] !== undefined) counts[l.level] += 1;
        });
        return counts;
    }, [logs]);

    // Paginação — reseta para a página 1 sempre que os logs ou filtros mudam
    useEffect(() => {
        setCurrentPage(1);
    }, [logs, activeLevels, searchTerms, search, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const pagedLogs = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, safePage, pageSize]);

    const selectedDayInfo = availableDays.find((d) => d.date === selectedDay);
    const dayButtonLabel = selectedDayInfo ? selectedDayInfo.date_display : 'Selecionar dia';
    const loadButtonLabel = selectedDayInfo ? `Carregar ${selectedDayInfo.date_display}` : 'Carregar Logs';

    return (
        <div className="logs-viewer-page" style={{ padding: '1.5rem', color: '#fff' }}>
            <header style={{ marginBottom: '1.5rem' }}>
                <h1>Visualizador de Logs</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Console em tempo real de todos os containers do sistema (backend, worker, beat, frontend, banco, redis, storage e túnel).
                </p>
            </header>

            <LogsActionBar
                dayPickerRef={dayPickerRef}
                dayPickerOpen={dayPickerOpen}
                setDayPickerOpen={setDayPickerOpen}
                dayButtonLabel={dayButtonLabel}
                handleSelectDay={handleSelectDay}
                selectedDay={selectedDay}
                loadingDays={loadingDays}
                availableDays={availableDays}
                tail={tail}
                setTail={setTail}
                handleLoadLogs={handleLoadLogs}
                loading={loading}
                loadButtonLabel={loadButtonLabel}
                setShowPasteModal={setShowPasteModal}
                handleClearView={handleClearView}
                totalLogCount={totalLogCount}
            />

            <LogsFilterBar
                containers={containers}
                selectedContainers={selectedContainers}
                toggleContainer={toggleContainer}
                quickFilters={quickFilters}
                activeTags={activeTags}
                toggleTag={toggleTag}
                selectedDay={selectedDay}
                timeFrom={timeFrom}
                setTimeFrom={setTimeFrom}
                timeTo={timeTo}
                setTimeTo={setTimeTo}
                search={search}
                setSearch={setSearch}
                handleSearchKeyDown={handleSearchKeyDown}
                searchTerms={searchTerms}
                setSearchTerms={setSearchTerms}
                removeSearchTerm={removeSearchTerm}
                activeLevels={activeLevels}
                toggleLevel={toggleLevel}
                levelCounts={levelCounts}
                errors={errors}
            />

            <LogsTable
                filteredLogs={filteredLogs}
                pagedLogs={pagedLogs}
                loading={loading}
                pageSize={pageSize}
                setPageSize={setPageSize}
                safePage={safePage}
                totalPages={totalPages}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                handleLoadLogs={handleLoadLogs}
                handleCopy={handleCopy}
                handleDownload={handleDownload}
            />

            {showPasteModal && (
                <LogsPasteModal
                    pastedText={pastedText}
                    setPastedText={setPastedText}
                    onAnalyze={handlePasteManually}
                    onClose={() => setShowPasteModal(false)}
                />
            )}
        </div>
    );
};

export default LogsViewer;
