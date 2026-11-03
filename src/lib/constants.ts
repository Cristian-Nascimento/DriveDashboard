export const PLATFORMS = {
  UBER: "Uber",
  NINETY_NINE: "99",
  INDRIVE: "inDrive",
  PARTICULAR: "Particular",
  OUTRO: "Outro",
} as const;

export const CAR_CATEGORIES = [
  "Combustível",
  "Manutenção",
  "Lavagem",
  "Pedágio/Estacionamento",
  "Alimentação",
  "Seguro",
  "IPVA/Licenciamento",
  "Aluguel/Parcela do carro",
  "Outros",
];

export const STORE_CATEGORIES = ["Embalagens", "Taxas", "Perdas", "Outros"];

// Tipos de despesa mensal (contas fixas e parceladas)
export const BILL_TYPES = [
  "Financiamento / parcela do carro",
  "Aluguel do carro",
  "Seguro",
  "IPVA / licenciamento",
  "Manutenção programada",
  "Internet / celular",
  "Empréstimo",
  "Cartão de crédito",
  "Estoque da vendinha",
  "Outros",
];

export type PlatformKey = keyof typeof PLATFORMS;
