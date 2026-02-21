import { useState, useEffect } from "react";

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  createdAt: Date;
}

const STORAGE_KEY = "rfp-analysis-prompt-templates";

export const usePromptTemplates = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTemplates(parsed.map((t: PromptTemplate) => ({
          ...t,
          createdAt: new Date(t.createdAt)
        })));
      } catch (e) {
        console.error("Failed to parse prompt templates:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  const addTemplate = (name: string, prompt: string) => {
    const newTemplate: PromptTemplate = {
      id: crypto.randomUUID(),
      name,
      prompt,
      createdAt: new Date()
    };
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = (id: string, updates: Partial<Omit<PromptTemplate, "id" | "createdAt">>) => {
    setTemplates(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  return { templates, addTemplate, updateTemplate, deleteTemplate };
};
