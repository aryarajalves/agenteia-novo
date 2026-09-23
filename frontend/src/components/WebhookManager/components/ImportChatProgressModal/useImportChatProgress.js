import { useState, useEffect } from 'react';

export const useImportChatProgress = (progress = {}) => {
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const [timerSec, setTimerSec] = useState(progress?.elapsedSeconds || 0);

    const {
        startedAt = null,
        elapsedSeconds = 0,
        done = false,
        cancelled = false,
        error = null
    } = progress || {};

    const isRunning = !done && !cancelled && !error;

    useEffect(() => {
        if (elapsedSeconds !== undefined && elapsedSeconds !== null) {
            setTimerSec(elapsedSeconds);
        }
    }, [elapsedSeconds]);

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            if (startedAt) {
                const now = Date.now() / 1000;
                setTimerSec(Math.max(0, Math.floor(now - startedAt)));
            } else {
                setTimerSec(prev => prev + 1);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning, startedAt]);

    const openConfirmCancel = () => setShowConfirmCancel(true);
    const closeConfirmCancel = () => setShowConfirmCancel(false);

    return {
        showConfirmCancel,
        setShowConfirmCancel,
        timerSec,
        isRunning,
        openConfirmCancel,
        closeConfirmCancel
    };
};

export default useImportChatProgress;
