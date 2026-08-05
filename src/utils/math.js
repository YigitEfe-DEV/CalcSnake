export function formatNumber(value) {
  if (Object.is(value, -0)) return '0';
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(10)).toString();
}

export function prettifyExpression(expression) {
  return expression
    .replace(/Math\.sqrt\(/g, '√(')
    .replace(/Math\.log10\(/g, 'log(')
    .replace(/Math\.sin\(/g, 'sin(')
    .replace(/Math\.cos\(/g, 'cos(')
    .replace(/Math\.tan\(/g, 'tan(')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/\^/g, '^');
}

export function computeExpression(expression) {
  let normalized = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/%/g, '/100')
    .replace(/\^/g, '**')
    .replace(/√\(/g, 'Math.sqrt(')
    .replace(/√(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(');

  normalized = applyFactorial(normalized);

  const sanitized = normalized
    .replace(/Math\.sqrt/g, 'Mathsqrt')
    .replace(/Math\.log10/g, 'Mathlog10')
    .replace(/Math\.sin/g, 'Mathsin')
    .replace(/Math\.cos/g, 'Mathcos')
    .replace(/Math\.tan/g, 'Mathtan');

  if (!/^[0-9+\-*/().,\sMathsqrtlogincostan]+$/.test(sanitized)) {
    throw new Error('Unsafe expression');
  }

  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${normalized});`)();
  if (result === Infinity || result === -Infinity) {
    throw new Error('Division by zero');
  }
  if (!Number.isFinite(result)) throw new Error('Invalid result');
  return result;
}

function applyFactorial(expression) {
  return expression.replace(/(\d+)!/g, (_, digits) => {
    const n = Number(digits);
    if (n < 0 || !Number.isInteger(n) || n > 20) throw new Error('Invalid factorial');
    let result = 1;
    for (let i = 2; i <= n; i += 1) result *= i;
    return String(result);
  });
}

export function mapEvaluationError(error) {
  const message = error?.message ?? '';
  if (message === 'Division by zero') return 'Cannot divide by zero';
  if (message === 'Unsafe expression') return 'Expression contains invalid characters';
  if (message === 'Invalid factorial') return 'Factorial requires a non-negative integer ≤ 20';
  return 'Invalid calculation';
}

export function hasDecimalInCurrentNumber(expression) {
  const segments = expression.split(/[+\-*/()^]/);
  return segments[segments.length - 1].includes('.');
}