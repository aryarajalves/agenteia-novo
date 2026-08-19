import { API_URL } from '../../../config';

export const showToast = (message, type = 'success') => {
    const event = new CustomEvent('app:toast', { detail: { message, type } });
    window.dispatchEvent(event);
};

export const normalizeContact = (v) => {
    const trimmed = v.trim();
    if (/[a-zA-Z]/.test(trimmed)) {
        return trimmed;
    }
    if (/\d/.test(trimmed)) {
        return trimmed.replace(/\D/g, '');
    }
    return trimmed;
};

export const generateToken = () => {
    return Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
};

export const formatDate = (dateInput) => {
    if (!dateInput) return '-';
    try {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            const utcStr = dateInput.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateInput) ? dateInput : dateInput + 'Z';
            date = new Date(utcStr);
        }
        return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch {
        return typeof dateInput === 'string' ? dateInput : '-';
    }
};

const getPublicBaseUrl = () => {
    if (API_URL && !API_URL.includes('localhost') && !API_URL.includes('127.0.0.1')) {
        return API_URL;
    }
    return 'https://backendagente.aryaraj.shop';
};

export const getReceiveUrl = (token) => `${getPublicBaseUrl()}/webhooks/receive/${token}`;
export const getMemoryUrl = (token, memoryToken) => `${getPublicBaseUrl()}/webhooks/memory/${memoryToken || token}`;
