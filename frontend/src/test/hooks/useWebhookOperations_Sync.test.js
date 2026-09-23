import { describe, it, expect } from 'vitest';
import { sanitizeWebhookPayload } from '../../components/WebhookManager/hooks/useWebhookOperations';

describe('useWebhookOperations - Sincronização de Funis e Passos de Follow-Up', () => {
    it('deve sincronizar os passos do funil padrão com followup_steps ao preparar payload', () => {
        const mockForm = {
            name: 'Teste Integração',
            token: 'slug-teste',
            followup_steps: [
                { delay_minutes: 60, unit: 'minutes', value: 60, type: 'ai' },
                { delay_minutes: 1440, unit: 'hours', value: 24, type: 'whatsapp_template' },
                { delay_minutes: 2880, unit: 'hours', value: 48, type: 'whatsapp_template' }
            ],
            followup_funnels: [
                {
                    id: 'followup_default',
                    name: 'Padrão / Principal',
                    is_default: true,
                    steps: [
                        { delay_minutes: 30, unit: 'minutes', value: 30, type: 'ai' }
                    ]
                }
            ]
        };

        const payload = sanitizeWebhookPayload(mockForm);

        expect(payload.followup_steps).toHaveLength(3);
        expect(payload.followup_funnels).toHaveLength(1);
        expect(payload.followup_funnels[0].steps).toHaveLength(3);
        expect(payload.followup_funnels[0].steps[0].delay_minutes).toBe(60);
        expect(payload.followup_funnels[0].steps[1].delay_minutes).toBe(1440);
        expect(payload.followup_funnels[0].steps[2].delay_minutes).toBe(2880);
    });

    it('deve criar o funil padrão com followup_steps se followup_funnels estiver vazio', () => {
        const mockForm = {
            name: 'Teste Integração',
            token: 'slug-teste',
            followup_steps: [
                { delay_minutes: 1440, unit: 'hours', value: 24 }
            ],
            followup_funnels: []
        };

        const payload = sanitizeWebhookPayload(mockForm);

        expect(payload.followup_funnels).toHaveLength(1);
        expect(payload.followup_funnels[0].id).toBe('followup_default');
        expect(payload.followup_funnels[0].steps[0].delay_minutes).toBe(1440);
    });
});
