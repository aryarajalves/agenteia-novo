import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useRegisterValidation } from './Register/useRegisterValidation';
import { PasswordStrengthChecklist } from './Register/PasswordStrengthChecklist';
import '../styles/Base/Register.css';

const Register = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [inviteInfo, setInviteInfo] = useState(null);
    const [validationError, setValidationError] = useState('');
    const [submitError, setSubmitError] = useState('');

    const rules = useRegisterValidation(password, confirmPassword);

    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            setValidating(true);
            setValidationError('');
            const res = await api.get(`/users/invites/validate/${token}`);
            const data = await res.json();
            
            if (res.ok && data.valid) {
                setInviteInfo(data);
            } else {
                setValidationError(data.detail || 'Este convite é inválido ou expirou.');
            }
        } catch (err) {
            setValidationError('Erro de conexão ao validar o convite.');
        } finally {
            setValidating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!rules.isValid) {
            if (!rules.hasMinLength || !rules.hasLetter || !rules.hasNumber || !rules.hasSpecial) {
                setSubmitError('A senha deve ter no mínimo 10 caracteres e conter letras, números e caracteres especiais.');
            } else if (!rules.isMatched) {
                setSubmitError('As senhas não coincidem.');
            }
            return;
        }

        setLoading(true);
        setSubmitError('');

        try {
            const res = await api.post(`/users/register/${token}`, {
                name,
                email,
                password
            });
            const data = await res.json();

            if (res.ok && data.success) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: 'Conta criada com sucesso! Faça login.', type: 'success' }
                }));
                navigate('/login');
            } else {
                setSubmitError(data.detail || 'Erro ao realizar o cadastro. Tente novamente.');
            }
        } catch (err) {
            setSubmitError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="register-page">
                <div className="register-box fade-in">
                    <div className="register-header">
                        <div className="register-brand-logo">🤖</div>
                        <h1>Validando...</h1>
                        <p>Por favor, aguarde enquanto validamos o seu convite.</p>
                    </div>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    if (validationError) {
        return (
            <div className="register-page">
                <div className="register-box fade-in">
                    <div className="register-header">
                        <div className="register-brand-logo" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>⚠️</div>
                        <h1 style={{ background: 'linear-gradient(135deg, #fff, #f87171)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Convite Inválido</h1>
                        <p style={{ color: '#f87171', marginTop: '12px' }}>{validationError}</p>
                    </div>
                    <button onClick={() => navigate('/login')} className="register-btn-primary">
                        Ir para Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="register-page">
            <div className="register-box fade-in">
                <div className="register-header">
                    <div className="register-brand-logo">👋</div>
                    <h1>Criar Conta</h1>
                    <p>
                        Você foi convidado como <span className="role-highlight-badge">{inviteInfo?.role || 'Usuário'}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="register-form" autoComplete="off">
                    {/* Bloqueio de preenchimento automático indevido do navegador */}
                    <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />
                    <input type="password" name="fakepasswordremembered" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

                    <div className="form-group">
                        <label htmlFor="register-name">Nome Completo</label>
                        <div className="register-input-wrapper">
                            <span className="register-input-icon">👤</span>
                            <input
                                id="register-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome completo"
                                autoComplete="off"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="register-email">E-mail</label>
                        <div className="register-input-wrapper">
                            <span className="register-input-icon">✉️</span>
                            <input
                                id="register-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                autoComplete="off"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="register-password">Senha</label>
                        <div className="register-input-wrapper">
                            <span className="register-input-icon">🔑</span>
                            <input
                                id="register-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Crie uma senha forte"
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                className="register-toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="register-confirm-password">Confirmar Senha</label>
                        <div className="register-input-wrapper">
                            <span className="register-input-icon">🔒</span>
                            <input
                                id="register-confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Digite a senha novamente"
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                className="register-toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <PasswordStrengthChecklist
                        rules={rules}
                        showMatch={confirmPassword.length > 0 || password.length > 0}
                    />

                    {submitError && <div className="register-error-msg">{submitError}</div>}

                    <button
                        type="submit"
                        className="register-btn-primary"
                        disabled={loading || !rules.isValid}
                    >
                        {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                    </button>
                </form>

                <div className="register-footer">
                    &copy; 2024 Agent Flow &bull; Automação Sem Limites
                </div>
            </div>
        </div>
    );
};

export default Register;
