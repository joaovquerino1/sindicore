export interface BoletoInput {
  id: string;
  amount: number;
  dueDate: string | Date;
}

export interface BoletoData {
  linhaDigitavel: string;
  barcode: string;
  nossoNumero: string;
  fatorVencimento: number;
  valorCentavos: string;
}

const BASE_DATE = new Date(Date.UTC(1997, 9, 7));

function digitsFromString(input: string, length: number): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  let seed = h >>> 0;
  while (out.length < length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    out += seed.toString().padStart(10, "0").slice(-10);
  }
  return out.slice(0, length);
}

function fatorVencimento(due: Date): number {
  const ms = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) - BASE_DATE.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(1000, Math.min(9999, days));
}

function mod10(num: string): number {
  let sum = 0;
  let mult = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i]) * mult;
    if (n > 9) n = Math.floor(n / 10) + (n % 10);
    sum += n;
    mult = mult === 2 ? 1 : 2;
  }
  const r = sum % 10;
  return r === 0 ? 0 : 10 - r;
}

function mod11(num: string): number {
  let sum = 0;
  let mult = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i]) * mult;
    mult = mult === 9 ? 2 : mult + 1;
  }
  const r = sum % 11;
  const dac = 11 - r;
  return dac === 0 || dac === 1 || dac === 10 || dac === 11 ? 1 : dac;
}

function formatLinhaDigitavel(barcode: string): string {
  const banco = barcode.substring(0, 4);
  const moeda = barcode.substring(3, 4);
  const fator = barcode.substring(5, 9);
  const valor = barcode.substring(9, 19);
  const livre = barcode.substring(19, 44);

  const c1 = banco + moeda + livre.substring(0, 5);
  const c2 = livre.substring(5, 15);
  const c3 = livre.substring(15, 25);

  const dac1 = mod10(c1);
  const dac2 = mod10(c2);
  const dac3 = mod10(c3);
  const dacGeral = barcode.substring(4, 5);

  const f1 = `${c1.substring(0, 5)}.${c1.substring(5, 10)}${dac1}`;
  const f2 = `${c2.substring(0, 5)}.${c2.substring(5, 10)}${dac2}`;
  const f3 = `${c3.substring(0, 5)}.${c3.substring(5, 10)}${dac3}`;
  const f4 = dacGeral;
  const f5 = `${fator}${valor}`;

  return `${f1} ${f2} ${f3} ${f4} ${f5}`;
}

export function generateBoleto(input: BoletoInput): BoletoData {
  const due = new Date(input.dueDate);
  const fator = fatorVencimento(due);
  const valorCentavos = Math.round(input.amount * 100)
    .toString()
    .padStart(10, "0");

  const banco = "237";
  const moeda = "9";
  const campoLivre = digitsFromString(input.id, 25);

  const semDac = `${banco}${moeda}${fator}${valorCentavos}${campoLivre}`;
  const dacGeral = mod11(semDac);
  const barcode = `${banco}${moeda}${dacGeral}${fator}${valorCentavos}${campoLivre}`;

  return {
    linhaDigitavel: formatLinhaDigitavel(barcode),
    barcode,
    nossoNumero: campoLivre.substring(10, 25),
    fatorVencimento: fator,
    valorCentavos,
  };
}

export function barcodeToInterleaved(barcode: string): { width: number; bars: { x: number; w: number; black: boolean }[] } {
  const PATTERNS: Record<string, string> = {
    "0": "nnwwn",
    "1": "wnnnw",
    "2": "nwnnw",
    "3": "wwnnn",
    "4": "nnwnw",
    "5": "wnwnn",
    "6": "nwwnn",
    "7": "nnnww",
    "8": "wnnwn",
    "9": "nwnwn",
  };
  const NARROW = 1;
  const WIDE = 3;

  const padded = barcode.length % 2 === 0 ? barcode : `0${barcode}`;
  const bars: { x: number; w: number; black: boolean }[] = [];
  let x = 0;

  const push = (w: number, black: boolean) => {
    bars.push({ x, w, black });
    x += w;
  };

  push(NARROW, true);
  push(NARROW, false);
  push(NARROW, true);
  push(NARROW, false);

  for (let i = 0; i < padded.length; i += 2) {
    const a = PATTERNS[padded[i]];
    const b = PATTERNS[padded[i + 1]];
    for (let k = 0; k < 5; k++) {
      const wA = a[k] === "w" ? WIDE : NARROW;
      const wB = b[k] === "w" ? WIDE : NARROW;
      push(wA, true);
      push(wB, false);
    }
  }

  push(WIDE, true);
  push(NARROW, false);
  push(NARROW, true);

  return { width: x, bars };
}
