import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  category: string;
  isBusiness: boolean;
  anomaly?: string;
}

export interface ParseResult {
  transactions: Transaction[];
  bankName: string;
  accountNumber: string;
  currency: string;
}

export async function parseStatement(file: File): Promise<ParseResult> {
  try {
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || "application/pdf"; // Default to PDF if unknown

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: `You are an expert financial analyst and data extraction engine.
          Analyze this bank statement and extract all transactions.
          
          For each transaction, determine:
          - date: ISO format (YYYY-MM-DD)
          - description: Cleaned up narration
          - amount: Absolute number (positive)
          - type: "debit" (money out) or "credit" (money in)
          - category: Smart categorization (e.g., Rent, Utilities, Salary, Subscriptions, Food, Travel, etc.)
          - isBusiness: Boolean. True if it looks like a business expense/income, False if personal.
          - anomaly: String. If the transaction looks suspicious, unusually large, or duplicate, add a note here. Otherwise leave empty.
          
          Also extract the bankName, accountNumber (mask all but last 4 digits), and currency (e.g., USD, INR, EUR).
          `,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bankName: { type: Type.STRING },
            accountNumber: { type: Type.STRING },
            currency: { type: Type.STRING },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  category: { type: Type.STRING },
                  isBusiness: { type: Type.BOOLEAN },
                  anomaly: { type: Type.STRING },
                },
                required: ["date", "description", "amount", "type", "category", "isBusiness"],
              },
            },
          },
          required: ["bankName", "accountNumber", "currency", "transactions"],
        },
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(response.text);
    
    // Add unique IDs to transactions
    result.transactions = result.transactions.map((t: any) => ({
      ...t,
      id: crypto.randomUUID(),
    }));

    return result as ParseResult;
  } catch (error) {
    console.error("Error parsing statement:", error);
    throw error;
  }
}

export async function categorizeTransactions(descriptions: string[]): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          text: `Categorize the following bank transaction descriptions into standard categories (e.g., Groceries, Utilities, Salary, Rent, Travel, Dining, Shopping, Health, Insurance, Subscriptions, Transfers, etc.).
          
          Descriptions:
          ${descriptions.join("\n")}
          
          Return only a JSON array of strings, where each string is the category for the corresponding description.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(response.text) as string[];
  } catch (error) {
    console.error("Error categorizing transactions:", error);
    throw error;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
