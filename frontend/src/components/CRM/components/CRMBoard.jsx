import React, { useRef, useState, useEffect } from 'react';
import CRMColumn from './CRMColumn';

const CRM_COLUMNS = [
    {
        key: 'template_enviado',
        title: 'Disparo Inicial (Template)',
        icon: '📤',
        badgeColor: '#c084fc',
        badgeBg: 'rgba(168, 85, 247, 0.15)'
    },
    {
        key: 'retentativas',
        title: 'Re-tentativas (Ciclo 2 e 3)',
        icon: '🔁',
        badgeColor: '#facc15',
        badgeBg: 'rgba(234, 179, 8, 0.15)'
    },
    {
        key: 'em_atendimento',
        title: 'Em Conversa IA',
        icon: '💬',
        badgeColor: '#38bdf8',
        badgeBg: 'rgba(56, 189, 248, 0.15)'
    },
    {
        key: 'remarketing',
        title: 'Remarketing D+1',
        icon: '🎧',
        badgeColor: '#fb923c',
        badgeBg: 'rgba(251, 146, 60, 0.15)'
    },
    {
        key: 'comprou',
        title: 'Comprou (Alunos)',
        icon: '🎉',
        badgeColor: '#34d399',
        badgeBg: 'rgba(52, 211, 153, 0.15)'
    },
    {
        key: 'desistiu',
        title: 'Não Converteu / Desistiu',
        icon: '🚪',
        badgeColor: '#f87171',
        badgeBg: 'rgba(239, 68, 68, 0.15)'
    }
];

const CRMBoard = ({
    columnsData = {},
    onLeadClick,
    onLeadDrop,
    onDragStart,
    onMassDispatch
}) => {
    const boardRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const isMouseDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleMouseDown = (e) => {
        // Apenas botão esquerdo do mouse
        if (e.button !== 0) return;
        // Se clicar em um card arrastável ou botão/input, não iniciar scroll do board
        if (e.target.closest('.crm-card') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('a')) {
            return;
        }

        isMouseDown.current = true;
        startX.current = e.pageX - (boardRef.current ? boardRef.current.offsetLeft : 0);
        scrollLeft.current = boardRef.current ? boardRef.current.scrollLeft : 0;
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isMouseDown.current || !boardRef.current) return;
        e.preventDefault();
        const x = e.pageX - boardRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5; // Multiplicador de rolagem suave
        boardRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const handleMouseUpOrLeave = () => {
        isMouseDown.current = false;
        setIsDragging(false);
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isMouseDown.current) {
                isMouseDown.current = false;
                setIsDragging(false);
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    return (
        <div 
            ref={boardRef}
            className={`crm-board ${isDragging ? 'is-dragging' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
        >
            {CRM_COLUMNS.map((col) => (
                <CRMColumn
                    key={col.key}
                    columnKey={col.key}
                    title={col.title}
                    icon={col.icon}
                    badgeColor={col.badgeColor}
                    badgeBg={col.badgeBg}
                    leads={columnsData[col.key] || []}
                    onLeadClick={onLeadClick}
                    onLeadDrop={onLeadDrop}
                    onDragStart={onDragStart}
                    onMassDispatch={onMassDispatch}
                />
            ))}
        </div>
    );
};

export default CRMBoard;
