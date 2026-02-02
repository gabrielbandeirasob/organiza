export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            transactions: {
                Row: {
                    id: string
                    created_at: string
                    description: string
                    amount: number
                    type: 'income' | 'expense'
                    category: string
                    date: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    description: string
                    amount: number
                    type: 'income' | 'expense'
                    category: string
                    date: string
                    user_id?: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    description?: string
                    amount?: number
                    type?: 'income' | 'expense'
                    category?: string
                    date?: string
                    user_id?: string
                }
            }
            categories: {
                Row: {
                    id: string
                    created_at: string
                    name: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    created_at?: string
                    name: string
                    user_id?: string
                }
                Update: {
                    id?: string
                    created_at?: string
                    name?: string
                    user_id?: string
                }
            }
        }
    }
}
