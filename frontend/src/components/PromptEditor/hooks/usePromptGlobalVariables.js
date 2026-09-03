import { useState, useEffect } from 'react';
import { api } from '../../../api/client';

export const usePromptGlobalVariables = () => {
    const [validVarKeys, setValidVarKeys] = useState([]);
    const [globalVarsList, setGlobalVarsList] = useState([]);

    useEffect(() => {
        const loadVars = async () => {
            try {
                const res = await api.get('/global-variables');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setValidVarKeys(data.map(v => v.key));
                        setGlobalVarsList(data);
                    } else if (data && Array.isArray(data.variables)) {
                        // Fallback seguro para suportar mocks legados
                        setValidVarKeys(data.variables.map(v => v.key));
                        setGlobalVarsList(data.variables);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar variáveis para o editor:", error);
            }
        };
        loadVars();
    }, []);

    return {
        validVarKeys,
        setValidVarKeys,
        globalVarsList,
        setGlobalVarsList
    };
};
