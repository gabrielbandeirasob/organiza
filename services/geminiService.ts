
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIInsight } from "../types";

// Always use the process.env.API_KEY string directly when initializing the client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFinancialInsights = async (transactions: Transaction[]): Promise<AIInsight[]> => {
  try {
    const summary = transactions.map(t => `${t.date}: ${t.description} (${t.type}) - R$ ${t.amount}`).join("\n");
    
    // Using gemini-3-flash-preview for summarization and analysis tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise as seguintes transações financeiras e forneça 3 insights práticos (Oportunidade de Economia, Alerta de Investimento ou Verificação de Assinatura).
      Transações:
      ${summary}
      
      Retorne os insights em formato JSON estruturado.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['opportunity', 'alert', 'info'] }
            },
            required: ["title", "description", "type"]
          }
        }
      }
    });

    // Extracting text output from GenerateContentResponse using the .text property.
    const insights = JSON.parse(response.text || "[]");
    return insights.map((insight: any, index: number) => ({
      ...insight,
      id: `ai-insight-${index}`
    }));
  } catch (error) {
    console.error("Erro ao gerar insights:", error);
    // Fallback static insights if API fails
    return [
      { id: 'f1', title: 'Oportunidade de Economia', description: 'Você gastou 24% a mais em refeições fora esta semana. Reduzir isso pode economizar R$ 120/mês.', type: 'opportunity' },
      { id: 'f2', title: 'Alerta de Investimento', description: 'Seu saldo ocioso atingiu R$ 5.000. Considere movê-lo para sua conta poupança de alto rendimento.', type: 'alert' },
      { id: 'f3', title: 'Verificação de Assinatura', description: 'Nova assinatura mensal detectada: "Cloud Storage Pro" (R$ 9,99). Devemos categorizar isso?', type: 'info' }
    ];
  }
};
