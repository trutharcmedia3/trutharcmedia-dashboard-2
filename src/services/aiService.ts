import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIInsight {
  title: string;
  text: string;
  icon: "Sparkles" | "AlertCircle" | "Zap" | "ShieldCheck" | "TrendingUp" | "Target" | "Cpu" | "Globe" | "Layers" | "Activity";
  color: "emerald" | "rose" | "amber" | "indigo" | "violet";
}

export const getAIInsights = async (data: any): Promise<AIInsight[]> => {
  try {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      You are the "Command Center Intelligence" for a high-performance creative/media agency. 
      Analyze the following telemetry data and provide 3-4 high-impact, strategic intelligence insights.
      
      Telemetry Data:
      - Active Operations: ${data.stats.activeProjects}
      - Task Backlog: ${data.stats.pendingTasks}
      - Revenue Stream: Rs. ${data.stats.totalRevenue}
      - Operational Burn: Rs. ${data.stats.totalExpenses}
      - Net Yield: Rs. ${data.stats.netProfit}
      - Efficiency Coefficient: ${data.stats.profitMargin.toFixed(1)}%
      - Imminent Deadlines: ${JSON.stringify(data.upcomingDeadlines)}
      - Critical Path Tasks: ${data.highPriorityTasks}
      - Personnel Count: ${data.teamSize}
      
      Strategic Directives:
      1. Be hyper-specific and use the data provided to justify recommendations.
      2. Focus on maximizing "Velocity" (efficiency), "Yield" (profitability), and "Stability" (risk management).
      3. Use a technical, high-level strategic tone (Mission Control style).
      4. Each insight must have a title (max 20 chars) and text (max 140 chars).
      5. Assign an appropriate icon and color based on the insight's strategic category.
    `;

    // Add a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              text: { type: Type.STRING },
              icon: { 
                type: Type.STRING,
                enum: ["Sparkles", "AlertCircle", "Zap", "ShieldCheck", "TrendingUp", "Target", "Cpu", "Globe", "Layers", "Activity"]
              },
              color: { 
                type: Type.STRING,
                enum: ["emerald", "rose", "amber", "indigo", "violet"]
              }
            },
            required: ["title", "text", "icon", "color"]
          }
        }
      }
    });

    clearTimeout(timeoutId);

    if (!response.text) return [];
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Insights Error:", error);
    return [];
  }
};

export interface FullAnalysisResponse {
  text: string;
  chartData: { name: string; value: number }[];
  roadmap: { phase: string; duration: string; tasks: string[] }[];
}

export const getFullAnalysis = async (data: any): Promise<FullAnalysisResponse> => {
  try {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      You are the Chief Strategy Officer (CSO) at Agency Command. Provide a comprehensive, multi-dimensional strategic analysis.
      
      Operational Telemetry:
      - Project Portfolio: ${JSON.stringify(data.projects)}
      - Task Execution: ${JSON.stringify(data.tasks)}
      - Financial Matrix: Revenue Rs. ${data.stats.totalRevenue}, Expenses Rs. ${data.stats.totalExpenses}, Efficiency ${data.stats.profitMargin.toFixed(1)}%
      - Personnel Matrix: ${data.teamSize} active members
      
      Strategic Report Requirements (JSON):
      1. "text": A technical, bold Markdown report with:
         # 🛰️ Strategic Intelligence Briefing
         ## 💎 Revenue Optimization & Yield Enhancement
         ## ⚡ Operational Velocity & Friction Analysis
         ## 🚀 Market Trajectory & Scalability Vectors
         ## 🧬 Human Capital Optimization & Load Balancing
         > **Core Strategic Directive:** (One high-impact, data-backed directive)
      2. "chartData": 8 objects { name: string, value: number } for "Strategic Readiness Scores" (0-100): 
         "Yield", "Velocity", "Retention", "Load", "Growth", "Stability", "Innovation", "Reach".
      3. "roadmap": 3 objects for a "30-Day Tactical Deployment":
         { "phase": "Phase Name", "duration": "Days 1-10", "tasks": ["Task 1", "Task 2"] }
      
      Tone: Technical, authoritative, and data-centric. Use sophisticated terminology.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            chartData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                },
                required: ["name", "value"]
              }
            },
            roadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phase: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["phase", "duration", "tasks"]
              }
            }
          },
          required: ["text", "chartData", "roadmap"]
        }
      }
    });

    if (!response.text) {
      return { text: "Unable to generate analysis.", chartData: [], roadmap: [] };
    }
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Full Analysis Error:", error);
    return { 
      text: "An error occurred while generating the full analysis. Please try again.",
      chartData: [],
      roadmap: []
    };
  }
};

export const getGrowthStrategy = async (data: any): Promise<string> => {
  try {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      You are a Senior Agency Growth Strategist. 
      Analyze the following agency data and provide a comprehensive ${data.type === 'expansion' ? 'Expansion Plan' : 'Market Analysis'} in Markdown format.
      
      Agency Data:
      - Projects: ${data.projects.length}
      - Team Size: ${data.teamMembers.length}
      - Growth Rate: ${data.growthMetrics.growthRate.toFixed(1)}%
      - LTV: Rs. ${data.growthMetrics.ltv.toFixed(0)}
      - CAC: Rs. ${data.growthMetrics.cac.toFixed(0)}
      
      The report should include:
      # ${data.type === 'expansion' ? '🚀 Strategic Expansion Plan' : '📈 Market Opportunity Analysis'}
      ## 📊 Current State Assessment
      ## 🎯 Strategic Objectives
      ## 🛠️ Actionable Recommendations
      ## ⚠️ Risk Mitigation
      
      Use bold text, bullet points, and a professional tone.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    return response.text || "Unable to generate strategy.";
  } catch (error) {
    console.error("Growth Strategy Error:", error);
    return "An error occurred while generating the growth strategy.";
  }
};
