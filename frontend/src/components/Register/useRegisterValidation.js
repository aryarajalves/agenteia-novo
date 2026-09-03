import { useMemo } from 'react';

export const useRegisterValidation = (password = '', confirmPassword = '') => {
    const rules = useMemo(() => {
        const hasMinLength = (password || '').length >= 10;
        const hasLetter = /[a-zA-Z]/.test(password || '');
        const hasNumber = /[0-9]/.test(password || '');
        const hasSpecial = /[^a-zA-Z0-9]/.test(password || '');
        const isMatched = (password || '').length > 0 && password === confirmPassword;
        const isValid = hasMinLength && hasLetter && hasNumber && hasSpecial && isMatched;

        return {
            hasMinLength,
            hasLetter,
            hasNumber,
            hasSpecial,
            isMatched,
            isValid
        };
    }, [password, confirmPassword]);

    return rules;
};
