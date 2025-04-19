import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Evidence, FormRule } from '../models/evidence.model';

@Component({
    selector: 'app-evidence-form',
    templateUrl: './evidence-form.component.html',
    styleUrls: ['./evidence-form.component.scss']
})
export class EvidenceFormComponent implements OnInit, OnChanges {
    @Input() evidence!: Evidence;
    @Input() formRules: FormRule[] = [];

    ngOnInit(): void {
        // Initialize component
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.evidence || changes.formRules) {
            setTimeout(() => {
                this.applyFormRules();
            });
        }
    }

    private applyFormRules(): void {
        if (!this.formRules || this.formRules.length === 0) return;

        const activeRules = this.formRules.filter(rule => rule.active);
        if (activeRules.length === 0) return;

        const script = document.createElement('script');
        script.id = 'evidence-form-rules-script';

        const existingScript = document.getElementById('evidence-form-rules-script');
        if (existingScript) {
            existingScript.remove();
        }

        script.textContent = this.generateRulesScript(activeRules);

        document.body.appendChild(script);
    }

    private generateRulesScript(rules: FormRule[]): string {
        return `
        (function() {
            const rules = ${JSON.stringify(rules)};

            const fields = {};

            function initRules() {
                const formContainer = document.querySelector('.evidence-form-container');
                if (!formContainer) return;

                const inputs = formContainer.querySelectorAll('input, select, textarea');

                inputs.forEach(input => {
                    const name = input.getAttribute('name');
                    if (name) {
                        fields[name] = input;

                        input.addEventListener('change', evaluateRules);
                        input.addEventListener('input', evaluateRules);
                    }
                });

                evaluateRules();
            }

            function evaluateRules() {
                rules.forEach(evaluateRule);
            }

            function evaluateRule(rule) {
                if (rule.conditions.length === 0 && !rule.actions.some(a => a.type === 'calculate')) {
                    return;
                }

                if (rule.conditions.length === 0 && rule.actions.some(a => a.type === 'calculate')) {
                    applyRuleActions(rule);
                    return;
                }

                const conditionsMet = rule.conditions.every(evaluateCondition);

                if (conditionsMet) {
                    applyRuleActions(rule);
                } else {
                    revertRuleActions(rule);
                }
            }

            function evaluateCondition(condition) {
                const field = fields[condition.fieldName];
                if (!field) return false;

                let fieldValue = field.type === 'checkbox' ? field.checked : field.value;
                let testValue = condition.value;

                if (condition.operator === 'greaterThan' || condition.operator === 'lessThan') {
                    fieldValue = Number(fieldValue);
                    testValue = Number(testValue);

                    if (isNaN(fieldValue) || isNaN(testValue)) {
                        return false;
                    }
                }

                switch (condition.operator) {
                    case 'equals':
                        return fieldValue == testValue;
                    case 'notEquals':
                        return fieldValue != testValue;
                    case 'contains':
                        return String(fieldValue).includes(String(testValue));
                    case 'notContains':
                        return !String(fieldValue).includes(String(testValue));
                    case 'greaterThan':
                        return fieldValue > testValue;
                    case 'lessThan':
                        return fieldValue < testValue;
                    case 'isEmpty':
                        return !fieldValue;
                    case 'isNotEmpty':
                        return !!fieldValue;
                    default:
                        return false;
                }
            }

            function applyRuleActions(rule) {
                rule.actions.forEach(action => {
                    const targetField = fields[action.targetField];
                    if (!targetField) return;

                    const container = getFieldContainer(targetField);

                    switch (action.type) {
                        case 'enable':
                            targetField.disabled = false;
                            break;
                        case 'disable':
                            targetField.disabled = true;
                            break;
                        case 'show':
                            if (container) container.style.display = '';
                            break;
                        case 'hide':
                            if (container) container.style.display = 'none';
                            break;
                        case 'setValue':
                            if (targetField.type === 'checkbox') {
                                targetField.checked = action.value === true || action.value === 'true';
                            } else {
                                targetField.value = action.value;
                            }
                            targetField.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                        case 'calculate':
                            if (action.formula) {
                                const result = calculateFormula(action.formula);
                                if (result !== null) {
                                    targetField.value = result;
                                    targetField.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                            break;
                    }
                });
            }

            function revertRuleActions(rule) {
                rule.actions.forEach(action => {
                    const targetField = fields[action.targetField];
                    if (!targetField) return;

                    const container = getFieldContainer(targetField);

                    switch (action.type) {
                        case 'enable':
                            targetField.disabled = true;
                            break;
                        case 'disable':
                            targetField.disabled = false;
                            break;
                        case 'show':
                            if (container) container.style.display = 'none';
                            break;
                        case 'hide':
                            if (container) container.style.display = '';
                            break;
                    }
                });
            }

            function calculateFormula(formula) {
                try {
                    let expression = formula;

                    const fieldRegex = /\\b([a-zA-Z_][a-zA-Z0-9_]*)\\b/g;
                    const fieldMatches = formula.match(fieldRegex) || [];

                    fieldMatches.forEach(fieldName => {
                        if (fields[fieldName]) {
                            const field = fields[fieldName];
                            const value = field.type === 'checkbox' ? field.checked : field.value;
                            const numValue = value === '' ? 0 : Number(value);
                            if (!isNaN(numValue)) {
                                expression = expression.replace(new RegExp('\\b' + fieldName + '\\b', 'g'), numValue);
                            }
                        }
                    });

                    const result = Function('"use strict"; return (' + expression + ')')();

                    return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
                } catch (e) {
                    console.error('Error evaluating formula:', e);
                    return null;
                }
            }

            function getFieldContainer(field) {
                let elem = field;
                while (elem && !elem.classList.contains('form-group') && !elem.classList.contains('form-check') && elem !== document.body) {
                    elem = elem.parentElement;
                }
                return elem;
            }

            initRules();

            const observer = new MutationObserver(initRules);
            observer.observe(document.querySelector('.evidence-form-container') || document.body, { childList: true, subtree: true });
        })();
        `;
    }
}
