import { CARD_METHODS } from "./constants";

type MachineFees = { debitFee: number; creditFee: number; creditInstFee: number; pixFee: number };

/** Taxa (em centavos) cobrada pela maquininha para um recebimento bruto. */
export function computeFee(gross: number, method: string, machine: MachineFees | null): number {
  if (!machine) return 0;
  const rate =
    method === "DEBIT" ? machine.debitFee
    : method === "CREDIT" ? machine.creditFee
    : method === "CREDIT_INST" ? machine.creditInstFee
    : method === "PIX" ? machine.pixFee
    : 0;
  return Math.round((gross * rate) / 100);
}

/** Formas em que faz sentido escolher uma maquininha. */
export function usesMachine(method: string): boolean {
  return CARD_METHODS.includes(method) || method === "PIX";
}
