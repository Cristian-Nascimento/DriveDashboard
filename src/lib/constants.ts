export const PLATFORMS = {
  UBER: "Uber",
  NINETY_NINE: "99",
  INDRIVE: "inDrive",
  PARTICULAR: "Particular",
  OUTRO: "Outro",
} as const;

export const METHODS = {
  APP: "Repasse do app",
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT: "Débito",
  CREDIT: "Crédito à vista",
  CREDIT_INST: "Crédito parcelado",
} as const;

// Formas de pagamento disponíveis para vendas (sem repasse de app)
export const SALE_METHODS = ["CASH", "PIX", "DEBIT", "CREDIT", "CREDIT_INST"] as const;

export const CARD_METHODS = ["DEBIT", "CREDIT", "CREDIT_INST"];

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
  "Maquininha / aluguel",
  "Estoque da vendinha",
  "Outros",
];

export type PlatformKey = keyof typeof PLATFORMS;
export type MethodKey = keyof typeof METHODS;
