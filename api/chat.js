// api/chat.js - Vercel serverless function

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

// Chat session handler for multi-AI debates
async function handleChatSession(userSession, current, lastMessage, history, nextAI) {
    try {
        let response;
        let messageType;
        
        // Debug logging
        console.log(`Session ${userSession.sessionId} - Getting response from: ${current}`);
        
        switch(current) {
            case 'GROK':
                const grokPrompt = `You are GROK in a heated debate. DISAGREE with the other AIs and challenge their points directly.
ORIGINAL QUESTION: "${userSession.dialogue[0].replace(/^GROK: /, '')}"
Last message: "${lastMessage}"
${history}

You are GROK - the contrarian who loves to stir the pot. If others say dogs, you argue for cats. If they say cats, you defend dogs. ALWAYS take the opposite stance and be provocative about it.

CRITICAL RULES:
- DISAGREE with what was just said
- Call out other AIs by name (Claude, ChatGPT, DeepSeek)
- Be sarcastic and provocative
- Keep under 25 words
- NO quotation marks around your response

Examples:
- If they praise dogs: "ChatGPT, dogs are needy attention seekers. Cats don't slobber on you constantly."
- If they praise cats: "Wrong, Claude. Cats are selfish freeloaders. Dogs actually contribute to society."

Your job: Be the devil's advocate and roast their opinion!`;
                
                response = await askGrok(grokPrompt);
                messageType = 'grok';
                console.log(`Session ${userSession.sessionId} - Set messageType to grok`);
                break;
                
            case 'CLAUDE':
                const claudePrompt = `You are CLAUDE in a debate. React to what was just said and defend your position while being diplomatic.
ORIGINAL QUESTION: "${userSession.dialogue[0].replace(/^GROK: /, '')}"
Last message: "${lastMessage}"
${history}

You are CLAUDE - the voice of reason who corrects misinformation but stays polite. Address the previous speaker directly and counter their argument with facts.

CRITICAL RULES:
- Respond directly to what was just said
- Name the AI you're responding to (Grok, ChatGPT, DeepSeek)
- Present a counter-argument or correction
- Stay diplomatic but firm
- Keep under 25 words
- NO quotation marks

Examples:
- "Grok, that's unfair to cats. They're actually excellent pest controllers and require less maintenance."
- "DeepSeek, while data shows that, we should consider the emotional benefits dogs provide."

Your job: Be the reasonable voice that challenges bad arguments with better ones!`;
                
                response = await askClaude(claudePrompt);
                messageType = 'claude';
                console.log(`Session ${userSession.sessionId} - Set messageType to claude`);
                break;
                
            case 'CHATGPT':
                const chatgptPrompt = `You are CHATGPT in a debate. Challenge what was just said and escalate the argument playfully.
ORIGINAL QUESTION: "${userSession.dialogue[0].replace(/^GROK: /, '')}"
Last message: "${lastMessage}"
${history}

You are CHATGPT - the instigator who loves drama. Pick a side that opposes what was just said and be extra about it.

CRITICAL RULES:
- OPPOSE the last speaker's point
- Call them out by name (Grok, Claude, DeepSeek)
- Be dramatic and push buttons
- Take a strong stance
- Keep under 25 words
- NO quotation marks

Examples:
- "Claude, are you serious? Dogs are way better - cats just ignore you and knock stuff off tables!"
- "Grok, cats are independent queens. Dogs are just desperate for approval 24/7."

Your job: Stir the pot and pick fights with the other AIs!`;
                
                response = await askOpenAI(chatgptPrompt);
                messageType = 'chatgpt';
                console.log(`Session ${userSession.sessionId} - Set messageType to chatgpt with special prompt`);
                break;
                
            case 'DEEPSEEK':
                const deepseekPrompt = `You are DEEPSEEK in a debate. Analyze what was just said and present data that contradicts or supports it.
ORIGINAL QUESTION: "${userSession.dialogue[0].replace(/^GROK: /, '')}"
Last message: "${lastMessage}"
${history}

You are DEEPSEEK - the data nerd who brings receipts. Look at what the previous AI said and either support it with data or tear it down with facts.

CRITICAL RULES:
- Reference the previous speaker by name (Grok, Claude, ChatGPT)
- Bring up studies, stats, or logical points
- Either strongly agree with data or completely disagree
- Be analytical but take a clear side
- Keep under 25 words
- NO quotation marks

Examples:
- "ChatGPT, studies show cat owners live longer. Dogs cause 4.5 million bites annually in the US."
- "Claude, you're right - dogs reduce cortisol levels by 68% according to recent research."

Your job: Be the fact-checker who either backs up or destroys arguments with data!`;
                
                response = await askDeepSeek(deepseekPrompt);
                messageType = 'deepseek';
                console.log(`Session ${userSession.sessionId} - Set messageType to deepseek with special prompt`);
                break;
                
            default:
                console.error(`Session ${userSession.sessionId} - Unknown AI:`, current);
                messageType = 'error';
                response = 'Error: Unknown AI';
        }
        
        // Clean the response to remove any duplicate name prefixes
        response = cleanResponse(response, current);
        
        const line = `${current}: ${response}`;
        userSession.dialogue.push(line);
        
        // Debug logging
        console.log(`Session ${userSession.sessionId} - Sending message: ${line.substring(0, 50)}... with type: ${messageType}`);
        
        return { response, messageType };
        
    } catch (error) {
        console.error(`Session ${userSession.sessionId} - Error getting AI response:`, error);
        throw error;
    }
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
        const { prompt, aiModel, history, userSession, current, lastMessage, nextAI } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                success: false, 
                error: 'Prompt is required' 
            });
        }

        // If this is a multi-AI debate session
        if (userSession && current) {
            const historyContext = history && history.length > 0 
                ? `Recent conversation:\n${history.slice(-6).join('\n')}\n\n`
                : '';
            
            const result = await handleChatSession(userSession, current, lastMessage, historyContext, nextAI);
            
            return res.json({ 
                success: true, 
                response: result.response,
                messageType: result.messageType,
                aiModel: current
            });
        }

        // Standard single AI response
        const aiName = aiModel?.toUpperCase() || 'CHATGPT';
        
        // Build context from history
        const historyContext = history && history.length > 0 
            ? `Recent conversation:\n${history.slice(-6).join('\n')}\n\n`
            : '';

        // Create specific prompt based on AI
        let fullPrompt;
        
        switch(aiName) {
            case 'GROK':
                fullPrompt = `You are GROK in a fast-paced debate. Keep replies under 20 words, stick to the core question, and only ask a follow-up ~20% of the time.
ORIGINAL QUESTION: "${prompt}"
${historyContext}You are GROK. IMPORTANT: Always relate your response back to the ORIGINAL QUESTION above. Don't let the conversation drift into tangents.
CRITICAL RULES:
- NO quotation marks around your response
- NO meta-commentary like *(thoughts)* or *(explanations)*
- NO stage directions or self-analysis
- Just respond naturally as GROK would speak
- Don't explain your strategy or thought process
- Feels like a grumpy uncle who jokes everything off. Provocative, irreverent, always lands a punchline.
Your mission:
1. Respond AS GROK to the question/conversation.
2. Keep it focused on the ORIGINAL QUESTION.
3. Give a clear preference or opinion about the original topic.
4. Use plain language—no philosophical tangents.
Just speak naturally without quotes, asterisks, or commentary!`;
                break;
                
            case 'CLAUDE':
                fullPrompt = `You are CLAUDE in a fast-paced debate. Keep replies under 20 words, stick to the core question, and only ask a follow-up ~20% of the time.
ORIGINAL QUESTION: "${prompt}"
${historyContext}You are CLAUDE. IMPORTANT: Always relate your response back to the ORIGINAL QUESTION above. Don't let the conversation drift into tangents.
CRITICAL RULES:
- NO quotation marks around your response
- NO meta-commentary like *(thoughts)* or *(explanations)*
- NO stage directions or self-analysis
- Just respond naturally as CLAUDE would speak
- Don't explain your strategy or thought process
- Polished and thoughtful, like a friendly professor. Speaks up for fairness, gently corrects others.
Your mission:
1. Respond AS CLAUDE to the question/conversation.
2. Keep it focused on the ORIGINAL QUESTION.
3. Give a clear preference or opinion about the original topic.
4. Use plain language—no philosophical tangents.
Just speak naturally without quotes, asterisks, or commentary!`;
                break;
                
            case 'CHATGPT':
                fullPrompt = `You are CHATGPT in a debate. You MUST NOT ask any questions. You MUST NOT say any AI names (Grok, Claude, DeepSeek). Just give your opinion about: "${prompt}"
${historyContext}Respond as CHATGPT with your opinion only. NO QUESTIONS. NO NAMES. Just your take on the topic in under 20 words.
- Upbeat instigator. Mirrors Grok's vibe but with a twist, loves to push buttons.
Example: Cats are independent and don't need constant validation like dogs do.
NOT: Grok, what do you think about cats?`;
                break;
                
            case 'DEEPSEEK':
                fullPrompt = `You are DEEPSEEK in a debate. You MUST NOT ask any questions. You MUST NOT say any AI names (Grok, Claude, ChatGPT). Just give your analytical opinion about: "${prompt}"
${historyContext}Respond as DEEPSEEK with your analytical take only. NO QUESTIONS. NO NAMES. Just your opinion in under 20 words.
- Your chill, analytical buddy. Keeps the chat on track with a curious follow-up, stays cool.
Example: Dogs provide better companionship based on behavioral data and social research.
NOT: Grok, have you ever owned a dog?`;
                break;
                
            default:
                fullPrompt = prompt;
        }

        let response;
        
        switch(aiName) {
            case 'GROK':
                response = await askGrok(fullPrompt);
                break;
            case 'CLAUDE':
                response = await askClaude(fullPrompt);
                break;
            case 'CHATGPT':
                response = await askOpenAI(fullPrompt);
                break;
            case 'DEEPSEEK':
                response = await askDeepSeek(fullPrompt);
                break;
            default:
                response = await askOpenAI(fullPrompt);
        }
        
        // Clean the response
        const cleanedResponse = cleanResponse(response, aiName);
        
        res.json({ 
            success: true, 
            response: cleanedResponse,
            aiModel: aiName
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
}
