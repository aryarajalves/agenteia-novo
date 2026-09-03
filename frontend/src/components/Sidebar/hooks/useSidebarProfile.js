import { useState, useEffect } from 'react';
import { API_URL, AGENT_API_KEY } from '../../../config';

export function useSidebarProfile() {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [userData, setUserData] = useState({ 
        name: '', 
        email: '', 
        password: '',
        company_name: '',
        company_logo: '',
        company_logo_size: 'medium'
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const [companyName, setCompanyName] = useState(localStorage.getItem('company_name') || '');
    const [companyLogo, setCompanyLogo] = useState(localStorage.getItem('company_logo') || '');
    const [companyLogoSize, setCompanyLogoSize] = useState(localStorage.getItem('company_logo_size') || 'medium');

    useEffect(() => {
        document.title = companyName ? companyName : 'Agente de IA';
    }, [companyName]);

    const userRole = localStorage.getItem('user_role') || 'Usuário';
    const isSuperAdmin = userRole === 'Super Admin';
    const isAdmin = userRole === 'Admin';
    const isUser = userRole === 'Usuário';

    const fetchUserData = async () => {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                    'X-API-Key': AGENT_API_KEY
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUserData({ 
                    name: data.name || '', 
                    email: data.email || '', 
                    password: '',
                    company_name: data.company_name || '',
                    company_logo: data.company_logo || '',
                    company_logo_size: data.company_logo_size || 'medium'
                });
                
                if (data.company_name !== undefined) {
                    localStorage.setItem('company_name', data.company_name || '');
                    setCompanyName(data.company_name || '');
                }
                if (data.company_logo !== undefined) {
                    localStorage.setItem('company_logo', data.company_logo || '');
                    setCompanyLogo(data.company_logo || '');
                }
                if (data.company_logo_size !== undefined) {
                    localStorage.setItem('company_logo_size', data.company_logo_size || 'medium');
                    setCompanyLogoSize(data.company_logo_size || 'medium');
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                    'X-API-Key': AGENT_API_KEY
                },
                body: JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    password: userData.password || undefined,
                    company_name: userData.company_name,
                    company_logo: userData.company_logo,
                    company_logo_size: userData.company_logo_size
                })
            });
            if (response.ok) {
                const updated = await response.json();
                if (updated && updated.name) {
                    localStorage.setItem('user_name', updated.name);
                }
                localStorage.setItem('company_name', updated.company_name || '');
                localStorage.setItem('company_logo', updated.company_logo || '');
                localStorage.setItem('company_logo_size', updated.company_logo_size || 'medium');
                setCompanyName(updated.company_name || '');
                setCompanyLogo(updated.company_logo || '');
                setCompanyLogoSize(updated.company_logo_size || 'medium');

                setStatus({ type: 'success', message: 'Perfil atualizado com sucesso!' });
                setTimeout(() => {
                    setShowSettingsModal(false);
                    setStatus({ type: '', message: '' });
                }, 1500);
            } else {
                const err = await response.json();
                setStatus({ type: 'error', message: err.detail || 'Erro ao atualizar.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Erro de conexão ou autenticação.' });
        } finally {
            setLoading(false);
        }
    };

    const openSettings = () => {
        setStatus({ type: '', message: '' });
        fetchUserData();
        setShowSettingsModal(true);
    };

    return {
        showLogoutModal,
        setShowLogoutModal,
        showSettingsModal,
        setShowSettingsModal,
        userData,
        setUserData,
        loading,
        status,
        companyName,
        companyLogo,
        companyLogoSize,
        userRole,
        isSuperAdmin,
        isAdmin,
        isUser,
        handleUpdateUser,
        openSettings
    };
}
