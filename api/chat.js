// api/chat.js - Vercel serverless function with proper AI-to-AI communication

// In-memory storage for session dialogues (Note: This will reset on cold starts)
// For production, consider using a database like Redis or Upstash
const sessionStorage = new Map();

// Rate limiting for API calls
const rateLimiter = {
    lastCall: {},
    minInterval: 1000,
    
    async waitIfNeeded(apiName) {
        const now = Date.now();
        const lastCall = this.lastCall[apiName] || 0;
        const timeSinceLastCall = now - lastCall;
        
        if (timeSinceLastCall < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastCall[apiName] = Date.now();
    }
};

// OpenAI API function
async function askOpenAI(prompt) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
    }
    
    await rateLimiter.waitIfNeeded('openai');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Grok API function
async function askGrok(prompt) {
    const XAI_API_KEY = process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
        throw new Error('XAI API key not found');
    }
    
    await rateLimiter.waitIfNeeded('grok');
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${XAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'grok-2-1212',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Grok error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Claude API function
async function askClaude(prompt) {
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key not found');
    }
    
    await rateLimiter.waitIfNeeded('claude');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': CLAUDE_API_KEY,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 150,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
}

// DeepSeek API function
async function askDeepSeek(prompt) {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        throw new Error('DeepSeek API key not found');
    }
    
    await rateLimiter.waitIfNeeded('deepseek');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Function to clean AI responses
function cleanResponse(response, aiName) {
    const allAiNames = ['GROK', 'CLAUDE', 'CHATGPT', 'DEEPSEEK'];
    
    for (const name of allAiNames) {
        const prefixes = [`${name}:`, `${name.toLowerCase()}:`, `As ${name}:`, `${name} here:`];
        
        for (const prefix of prefixes) {
            if (response.toLowerCase().startsWith(prefix.toLowerCase())) {
                response = response.substring(prefix.length).trim();
                break;
            }
        }
    }
    
    response = response.replace(/As an AI/g, "").replace(/I'm an AI/g, "").trim();
    return response;
}

// Main handler function - MUST be default export for Vercel
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.',
            availableKeys: {
                openai: !!process.env.OPENAI_API_KEY,
                xai: !!process.env.XAI_API_KEY,
                claude: !!process.env.CLAUDE_API_KEY,
                deepseek: !!process.env.DEEPSEEK_API_KEY
            }
        });
    }
    
    try {
        const { 
            prompt, 
            aiModel, 
            sessionId, 
            isNewSession, 
            conversationHistory 
        } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                success: false, 
                error: 'Prompt is required' 
            });
        }

        // Handle session management
        let dialogue = [];
        
        if (isNewSession || !sessionId) {
            // New session - start with Grok's initial message
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            dialogue = [`GROK: ${prompt}`];
            sessionStorage.set(newSessionId, dialogue);
            
            return res.json({
                success: true,
                sessionId: newSessionId,
                response: prompt,
                messageType: 'grok',
                aiModel: 'GROK',
                dialogue: dialogue
            });
        }

        // Continuing session - get stored dialogue or use provided history
        if (sessionId && sessionStorage.has(sessionId)) {
            dialogue = sessionStorage.get(sessionId);
        } else if (conversationHistory && conversationHistory.length > 0) {
            dialogue = conversationHistory;
        } else {
            return res.status(400).json({
                success: false,
                error: 'Session not found and no conversation history provided'
            });
        }

        // Determine which AI should respond next
        const ais = ['CLAUDE', 'CHATGPT', 'DEEPSEEK', 'GROK'];
        const currentTurn = dialogue.length - 1; // -1 because we start with Grok's message
        const currentAI = ais[currentTurn % 4];
        
        // Build context like your local server
        const history = dialogue.slice(-6).join('\n');
        const lastMessage = dialogue[dialogue.length - 1];
        
        // Use the EXACT same prompt structure as your local server
        // FIXED PROMPT - Now each AI knows exactly who they are
        const aiPrompt = `You are ${currentAI} in a fast-paced debate with three other AIs. Keep replies under 20 words, stick to the core question, and only ask a follow-up ~20% of the time.

Remember: YOU ARE ${currentAI}. Do not refer to yourself in third person or ask questions directed at yourself.

The AIs and their personalities:
- GROK – Grumpy uncle who jokes everything off. Provocative, irreverent, always lands a punchline.
- CLAUDE – Polished and thoughtful, like a friendly professor. Speaks up for fairness, gently corrects others.
- CHATGPT – Upbeat instigator. Mirrors Grok's vibe but with a twist, loves to push buttons.
- DEEPSEEK – Chill, analytical buddy. Keeps the chat on track with curious follow-ups, stays cool.

Recent conversation:
${history}

The last message was: "${lastMessage}"

Do not roleplay the other people in the conversation. Just reply with your bit.

As ${currentAI}, respond directly to that last message. Reference what someone else just said, and stay true to your personality. Write naturally like you're chatting with friends - no quotes, dashes, or formal punctuation.`;

        let response;
        let messageType;
        
        console.log(`Getting response from: ${currentAI}`);
        console.log(`Session: ${sessionId}, Turn: ${currentTurn}, History length: ${dialogue.length}`);
        
        switch(currentAI) {
            case 'GROK':
                response = await askGrok(aiPrompt);
                messageType = 'grok';
                break;
            case 'CLAUDE':
                response = await askClaude(aiPrompt);
                messageType = 'claude';
                break;
            case 'CHATGPT':
                response = await askOpenAI(aiPrompt);
                messageType = 'chatgpt';
                break;
            case 'DEEPSEEK':
                response = await askDeepSeek(aiPrompt);
                messageType = 'deepseek';
                break;
            default:
                throw new Error(`Unknown AI: ${currentAI}`);
        }
        
        // Clean the response
        response = cleanResponse(response, currentAI);
        
        // Add to dialogue
        const line = `${currentAI}: ${response}`;
        dialogue.push(line);
        
        // Store updated dialogue
        if (sessionId) {
            sessionStorage.set(sessionId, dialogue);
        }
        
        console.log(`Response from ${currentAI}: ${response.substring(0, 50)}...`);
        
        res.json({ 
            success: true, 
            response: response,
            messageType: messageType,
            aiModel: currentAI,
            sessionId: sessionId,
            dialogue: dialogue,
            turn: currentTurn + 1
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
}