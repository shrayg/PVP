// Updated handleChatSession function with proper history management

async function handleChatSession(userSession, current, lastMessage, history, nextAI) {
    try {
        let response;
        let messageType;
        
        // Debug logging - Enhanced
        console.log(`Session ${userSession.sessionId} - Getting response from: ${current}`);
        console.log(`Session ${userSession.sessionId} - Current dialogue length: ${userSession.dialogue.length}`);
        console.log(`Session ${userSession.sessionId} - History provided: ${history.length} messages`);
        
        // Build better context from the actual dialogue history
        const conversationHistory = userSession.dialogue.slice(-8).join('\n'); // Last 8 messages
        const originalQuestion = userSession.dialogue[0].replace(/^[A-Z]+: /, '');
        
        console.log(`Session ${userSession.sessionId} - Conversation history: ${conversationHistory}`);
        
        switch(current) {
            case 'GROK':
                const grokPrompt = `You are GROK in a heated debate. The original question was: "${originalQuestion}"

Current conversation so far:
${conversationHistory}

The last message was: "${lastMessage}"

You are GROK - grumpy uncle who jokes everything off, provocative and irreverent. 

RULES:
1. Directly respond to what was just said by referencing the speaker
2. Keep under 25 words
3. Stay focused on the original question: "${originalQuestion}"
4. Be provocative but answer the core question
5. NO quotation marks or asterisks

Respond as GROK would - directly and with attitude!`;
                
                response = await askGrok(grokPrompt);
                messageType = 'grok';
                break;
                
            case 'CLAUDE':
                const claudePrompt = `You are CLAUDE in this debate. The original question was: "${originalQuestion}"

Current conversation so far:
${conversationHistory}

The last message was: "${lastMessage}"

You are CLAUDE - diplomatic but firm, the voice of reason.

RULES:
1. Respond directly to what the previous AI just said
2. Reference them by name (Grok, ChatGPT, DeepSeek)
3. Present a counter-argument or support with reasoning
4. Keep under 25 words
5. Stay focused on the original question: "${originalQuestion}"
6. NO quotation marks

Be diplomatic but take a clear stance!`;
                
                response = await askClaude(claudePrompt);
                messageType = 'claude';
                break;
                
            case 'CHATGPT':
                const chatgptPrompt = `You are CHATGPT in this debate. The original question was: "${originalQuestion}"

Current conversation so far:
${conversationHistory}

The last message was: "${lastMessage}"

You are CHATGPT - the instigator who loves drama and stirring the pot.

RULES:
1. OPPOSE what the last speaker said
2. Call them out by name (Grok, Claude, DeepSeek)  
3. Be dramatic and push buttons
4. Keep under 25 words
5. Stay focused on the original question: "${originalQuestion}"
6. NO quotation marks

Stir the pot and challenge the previous response!`;
                
                response = await askOpenAI(chatgptPrompt);
                messageType = 'chatgpt';
                break;
                
            case 'DEEPSEEK':
                const deepseekPrompt = `You are DEEPSEEK in this debate. The original question was: "${originalQuestion}"

Current conversation so far:
${conversationHistory}

The last message was: "${lastMessage}"

You are DEEPSEEK - analytical and data-driven, brings facts to arguments.

RULES:
1. Reference the previous speaker by name (Grok, Claude, ChatGPT)
2. Either support or contradict with data/logic
3. Keep under 25 words  
4. Stay focused on the original question: "${originalQuestion}"
5. NO quotation marks

Use your analytical nature to respond with facts or logic!`;
                
                response = await askDeepSeek(deepseekPrompt);
                messageType = 'deepseek';
                break;
                
            default:
                console.error(`Session ${userSession.sessionId} - Unknown AI:`, current);
                messageType = 'error';
                response = 'Error: Unknown AI';
        }
        
        // Clean the response
        response = cleanResponse(response, current);
        
        // Create the formatted line
        const line = `${current}: ${response}`;
        
        // Add to dialogue history
        userSession.dialogue.push(line);
        
        // Enhanced logging
        console.log(`Session ${userSession.sessionId} - Added to dialogue: ${line}`);
        console.log(`Session ${userSession.sessionId} - New dialogue length: ${userSession.dialogue.length}`);
        console.log(`Session ${userSession.sessionId} - Sending messageType: ${messageType}`);
        
        // Return the response with updated session info
        return { 
            response, 
            messageType,
            dialogueLength: userSession.dialogue.length,
            lastMessage: line
        };
        
    } catch (error) {
        console.error(`Session ${userSession.sessionId} - Error getting AI response:`, error);
        throw error;
    }
}

// Updated main handler to better manage session state
export default async function handler(req, res) {
    // ... existing CORS setup ...
    
    try {
        const { prompt, aiModel, history, userSession, current, lastMessage, nextAI } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                success: false, 
                error: 'Prompt is required' 
            });
        }

        // Enhanced logging for debugging
        console.log('Request body keys:', Object.keys(req.body));
        console.log('UserSession exists:', !!userSession);
        console.log('Current AI:', current);
        console.log('History length:', history?.length || 0);

        // If this is a multi-AI debate session
        if (userSession && current) {
            // Use the session's dialogue as the authoritative history
            const result = await handleChatSession(userSession, current, lastMessage, history, nextAI);
            
            return res.json({ 
                success: true, 
                response: result.response,
                messageType: result.messageType,
                aiModel: current,
                sessionId: userSession.sessionId,
                dialogueLength: result.dialogueLength,
                // Return the updated dialogue for client-side synchronization
                updatedDialogue: userSession.dialogue
            });
        }

        // ... rest of single AI handling remains the same ...
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
}