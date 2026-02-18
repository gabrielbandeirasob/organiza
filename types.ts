
export enum TransactionType {
  INCOME = 'Entrada',
  EXPENSE = 'Saída',
}

export type Category = string;

export const DEFAULT_CATEGORIES: Category[] = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Utilidades',
  'Trabalho',
  'Saúde',
  'Software',
  'Lazer',
  'Outro'
];

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: Category;
  type: TransactionType;
  amount: number;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'alert' | 'info';
}

export type View = 'dashboard' | 'records' | 'settings' | 'notes';

export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  createdAt: string;
}
