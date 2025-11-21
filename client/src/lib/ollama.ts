export interface OllamaResponse {
  response: string;
  model: string;
  created_at: string;
  done: boolean;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl = 'http://localhost:11434', defaultModel = 'kala185/CyberKiller:0.1') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async generate(prompt: string, options?: Partial<OllamaRequest>): Promise<string> {
    try {
      const request: OllamaRequest = {
        model: options?.model || this.defaultModel,
        prompt,
        stream: false,
        ...options
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error('Unable to connect to AI service. Please ensure Ollama is running.');
    }
  }

  async generateSecurityResponse(question: string): Promise<string> {
    const securityPrompt = `You are a cybersecurity expert assistant. Provide a comprehensive, actionable response to this security question. Focus on practical advice, best practices, and real-world solutions.

Question: ${question}

Please structure your response with:
1. A clear explanation of the topic
2. Practical recommendations
3. Code examples if applicable
4. Common pitfalls to avoid
5. Additional resources or tools

Response:`;

    return this.generate(securityPrompt, {
      options: {
        temperature: 0.3, // Lower temperature for more focused, factual responses
        top_p: 0.9,
      }
    });
  }

  async generateVulnerabilityFix(vulnerability: any): Promise<string> {
    const fixPrompt = `You are a security expert. Generate a comprehensive fix for this vulnerability:

Vulnerability Type: ${vulnerability.category}
Name: ${vulnerability.name}
Severity: ${vulnerability.severity}
Description: ${vulnerability.description}
Location: ${vulnerability.location}
Impact: ${vulnerability.impact}

Please provide:
1. Step-by-step remediation instructions
2. Code examples showing the fix
3. Configuration changes needed
4. Testing recommendations
5. Prevention measures for the future

Fix Details:`;

    return this.generate(fixPrompt, {
      options: {
        temperature: 0.2, // Very focused for technical fixes
        top_p: 0.8,
      }
    });
  }
}

export const ollama = new OllamaClient();
