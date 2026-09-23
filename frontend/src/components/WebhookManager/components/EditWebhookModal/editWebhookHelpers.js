/**
 * Helpers para sanitização e validação dos dados do formulário de Webhook.
 */

export const parseList = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) {
        try {
            return JSON.parse(val);
        } catch (e) {
            return [];
        }
    }
    return [];
};

export const getSafeEditForm = (editForm = {}) => {
    const safeForm = {
        name: '',
        token: '',
        leads_table: '',
        description: '',
        delay_seconds: 30,
        response_delay_seconds: 0,
        split_response_enabled: true,
        disable_ai_responses: false,
        process_audio: false,
        process_image: false,
        followup_enabled: false,
        followup_steps: [],
        followup_business_hours: {
            enabled: false,
            start: '08:00',
            end: '18:00',
            weekdays: true,
            saturday: false,
            sunday: false
        },
        followup_cancel_label: '',
        followup_required_label: '',
        followup_add_label: '',
        followup_on_reply: 'stop',
        abandonment_delay_value: 24,
        abandonment_delay_unit: 'hours',
        purchased_label: '',
        agent_id: '',
        secondary_agent_ids: [],
        allowed_contacts: [],
        blocked_messages: [],
        delete_keywords: [],
        delete_message: '',
        delete_labels: [],
        zapvoice_url: '',
        zapvoice_api_token: '',
        zapvoice_client_id: '',
        labels_on_message: [],
        ignore_by_label: '',
        negative_feedback_label: '',
        window_close_label: [],
        handoff_labels_to_remove: [],
        handoff_labels_to_add: [],
        handoff_keyword: '',
        handoff_message: '',
        ai_handoff_labels_to_remove: [],
        ai_handoff_labels_to_add: [],
        ai_handoff_keyword: '',
        ai_handoff_message: '',
        project_assistant_label: '',
        project_assistant_keyword: '',
        project_assistant_deactivate_keyword: '',
        project_assistant_entry_message: '',
        project_assistant_exit_message: '',
        ...editForm
    };

    safeForm.secondary_agent_ids = parseList(safeForm.secondary_agent_ids);
    safeForm.allowed_contacts = parseList(safeForm.allowed_contacts);
    safeForm.blocked_messages = parseList(safeForm.blocked_messages);
    safeForm.delete_keywords = parseList(safeForm.delete_keywords);
    safeForm.delete_labels = parseList(safeForm.delete_labels);
    safeForm.followup_steps = parseList(safeForm.followup_steps);
    safeForm.labels_on_message = parseList(safeForm.labels_on_message);
    safeForm.window_close_label = parseList(safeForm.window_close_label);
    safeForm.handoff_labels_to_add = parseList(safeForm.handoff_labels_to_add);
    safeForm.handoff_labels_to_remove = parseList(safeForm.handoff_labels_to_remove);
    safeForm.ai_handoff_labels_to_add = parseList(safeForm.ai_handoff_labels_to_add);
    safeForm.ai_handoff_labels_to_remove = parseList(safeForm.ai_handoff_labels_to_remove);

    return safeForm;
};
