/**
 * Avalia operadores lógicos numéricos e de texto.
 */
export function evaluateComparison(varVal, op, targetVal) {
    if (varVal === undefined || varVal === null) varVal = '';
    if (targetVal === undefined || targetVal === null) targetVal = '';
    
    const trimmedVal = String(varVal).trim();
    const trimmedTarget = String(targetVal).trim();

    const isNumVal = !isNaN(trimmedVal) && trimmedVal !== '';
    const isNumTarget = !isNaN(trimmedTarget) && trimmedTarget !== '';
    
    if (isNumVal && isNumTarget) {
        const nVal = Number(trimmedVal);
        const nTarget = Number(trimmedTarget);
        switch (op) {
            case '==': return nVal === nTarget;
            case '!=': return nVal !== nTarget;
            case '>': return nVal > nTarget;
            case '<': return nVal < nTarget;
            case '>=': return nVal >= nTarget;
            case '<=': return nVal <= nTarget;
            default: return false;
        }
    }
    
    switch (op) {
        case '==': return trimmedVal.toLowerCase() === trimmedTarget.toLowerCase();
        case '!=': return trimmedVal.toLowerCase() !== trimmedTarget.toLowerCase();
        case '>': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) > 0;
        case '<': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) < 0;
        case '>=': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) >= 0;
        case '<=': return trimmedVal.toLowerCase().localeCompare(trimmedTarget.toLowerCase()) <= 0;
        default: return false;
    }
}

/**
 * Coleta todas as variáveis utilizadas na condicional principal, AND e ELIFs.
 */
export function getUsedVars({ selectedVar, addAndCondition, andVar, elifsList }) {
    const vars = new Set();
    if (selectedVar) vars.add(selectedVar);
    if (addAndCondition && andVar) vars.add(andVar);
    if (elifsList) {
        elifsList.forEach(elif => {
            if (elif.variable) vars.add(elif.variable);
        });
    }
    return Array.from(vars);
}

/**
 * Simula o resultado esperado com base nos valores preenchidos.
 */
export function getEvaluationResult({
    selectedVar,
    simulatedValues,
    condOperator,
    condValue,
    addAndCondition,
    andVar,
    andOperator,
    andValue,
    condTrueText,
    elifsList,
    condFalseText
}) {
    if (!selectedVar) return '';
    
    const mainVal = simulatedValues[selectedVar] || '';
    let mainPassed = evaluateComparison(mainVal, condOperator, condValue);
    
    if (addAndCondition && andVar) {
        const andValComputed = simulatedValues[andVar] || '';
        const andPassed = evaluateComparison(andValComputed, andOperator, andValue);
        mainPassed = mainPassed && andPassed;
    }
    
    if (mainPassed) {
        return condTrueText || '(Texto de retorno vazio)';
    }
    
    if (elifsList && elifsList.length > 0) {
        for (const elif of elifsList) {
            if (elif.variable) {
                const elifVal = simulatedValues[elif.variable] || '';
                const elifPassed = evaluateComparison(elifVal, elif.operator, elif.value);
                if (elifPassed) {
                    return elif.trueText || '(Texto de retorno vazio)';
                }
            }
        }
    }
    
    return condFalseText || '(Texto de retorno vazio)';
}
