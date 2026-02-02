
import { Transaction, TransactionType } from './types';

// Fix: Category is a type alias for string, so we use string literals directly.
export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-24', description: 'Salário Mensal', category: 'Trabalho', type: TransactionType.INCOME, amount: 5000.00 },
  { id: '2', date: '2023-10-23', description: 'Mercado Whole Foods', category: 'Alimentação', type: TransactionType.EXPENSE, amount: 120.50 },
  { id: '3', date: '2023-10-22', description: 'Adobe Creative Cloud', category: 'Software', type: TransactionType.EXPENSE, amount: 52.99 },
  { id: '4', date: '2023-10-20', description: 'Freelance: Design de Logo', category: 'Trabalho', type: TransactionType.INCOME, amount: 1200.00 },
  { id: '5', date: '2023-10-18', description: 'Aluguel Apartamentos Central', category: 'Moradia', type: TransactionType.EXPENSE, amount: 2100.00 },
  { id: '6', date: '2023-10-15', description: 'Restaurante Sushi', category: 'Alimentação', type: TransactionType.EXPENSE, amount: 85.00 },
  { id: '7', date: '2023-10-12', description: 'Uber Viagem', category: 'Transporte', type: TransactionType.EXPENSE, amount: 22.40 },
  { id: '8', date: '2023-10-10', description: 'Conta de Luz', category: 'Utilidades', type: TransactionType.EXPENSE, amount: 110.00 },
  { id: '9', date: '2023-10-05', description: 'Venda de Equipamento Antigo', category: 'Outro', type: TransactionType.INCOME, amount: 300.00 },
  { id: '10', date: '2023-10-02', description: 'Farmácia', category: 'Saúde', type: TransactionType.EXPENSE, amount: 45.30 },
];
