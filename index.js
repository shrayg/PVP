// Load environment variables FIRST
require('dotenv').config();

// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Serve type.mp3 from root directory
app.get('/type.mp3', (req, res) => {
    res.sendFile(path.join(__dirname, 'type.mp3'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Debug: Check if API keys are loaded
console.log('API Keys Status:');
console.log('OpenAI:', OPENAI_API_KEY ? 'Loaded' : 'Missing');
console.log('XAI:', XAI_API_KEY ? 'Loaded' : 'Missing');
console.log('Claude:', CLAUDE_API_KEY ? 'Loaded' : 'Missing');
console.log('DeepSeek:', DEEPSEEK_API_KEY ? 'Loaded' : 'Missing');

// OpenAI API function
async function askOpenAI(prompt) {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
    }
    
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.data || error.message);
        throw new Error(`OpenAI error: ${error.response?.data?.error?.message || error.message}`);
    }
}

// Grok API function
async function askGrok(prompt) {
    if (!XAI_API_KEY) {
        throw new Error('XAI API key not found');
    }
    
    try {
        const response = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: 'grok-2-1212',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        }, {
            headers: {
                'Authorization': `Bearer ${XAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Grok API Error:', error.response?.data || error.message);
        throw new Error(`Grok error: ${error.response?.data?.error?.message || error.message}`);
    }
}

// Claude API function
async function askClaude(prompt) {
    if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key not found');
    }
    
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 150,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });
        return response.data.content[0].text.trim();
    } catch (error) {
        console.error('Claude API Error:', error.response?.data || error.message);
        throw new Error(`Claude error: ${error.response?.data?.error?.message || error.message}`);
    }
}

// DeepSeek API function
async function askDeepSeek(prompt) {
    if (!DEEPSEEK_API_KEY) {
        throw new Error('DeepSeek API key not found');
    }
    
    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('DeepSeek API Error:', error.response?.data || error.message);
        throw new Error(`DeepSeek error: ${error.response?.data?.error?.message || error.message}`);
    }
}

// Function to clean AI responses and remove duplicate name prefixes
function cleanResponse(response, aiName) {
    // Remove the AI name prefix if it appears at the start of the response
    const prefixes = [`${aiName}:`, `${aiName.toLowerCase()}:`, `As ${aiName}:`, `${aiName} here:`];
    
    for (const prefix of prefixes) {
        if (response.toLowerCase().startsWith(prefix.toLowerCase())) {
            response = response.substring(prefix.length).trim();
            break;
        }
    }
    
    // Clean up other common AI self-references
    response = response.replace(/As an AI/g, "").replace(/I'm an AI/g, "").trim();
    
    return response;
}

// Log to file function
async function logToFile(message) {
    try {
        await fs.appendFile('script.txt', message + '\n', 'utf8');
    } catch (error) {
        console.error('Error writing to script.txt:', error);
    }
}

// Clear log file
async function clearLogFile() {
    try {
        await fs.writeFile('script.txt', '', 'utf8');
    } catch (error) {
        console.error('Error clearing script.txt:', error);
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected');
    
    let chatRunning = false;
    let chatTimeout;
    let waitingForTypingComplete = false;

    socket.on('start-chat', async (data) => {
        const { initialPrompt } = data;
        
        if (chatRunning) {
            socket.emit('chat-stopped');
            clearTimeout(chatTimeout);
        }
        
        chatRunning = true;
        const dialogue = [`GROK: ${initialPrompt}`];
        const GROK = "GROK";
        const CLAUDE = "CLAUDE";
        const CHATGPT = "CHATGPT";
        const DEEPSEEK = "DEEPSEEK";
        
        // Clear log file
        await clearLogFile();
        
        // Send initial prompt
        socket.emit('message', {
            text: `GROK: ${initialPrompt}`,
            type: 'grok',
            shouldLog: true
        });
        
        // Start the conversation loop
        runChat(socket, dialogue, GROK, CLAUDE, CHATGPT, DEEPSEEK);
    });

    socket.on('stop-chat', () => {
        chatRunning = false;
        clearTimeout(chatTimeout);
        socket.emit('chat-stopped');
    });

    socket.on('typing-completed', () => {
        waitingForTypingComplete = false;
    });

    async function runChat(socket, dialogue, GROK, CLAUDE, CHATGPT, DEEPSEEK) {
        const turns = 100;
        const ais = [CLAUDE, CHATGPT, DEEPSEEK, GROK]; // Rotation order after initial Grok message
        
        for (let i = 0; i < turns && chatRunning; i++) {
            // Wait for previous message typing to complete
            if (waitingForTypingComplete) {
                while (waitingForTypingComplete && chatRunning) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            if (!chatRunning) break;
            
            // Wait 2 seconds before sending the next message
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (!chatRunning) break;
            
            const current = ais[i % 4]; // Changed to 4 AIs
            const history = dialogue.slice(-6).join('\n');
            const lastMessage = dialogue[dialogue.length - 1];
            
            const prompt = `You’re one of four AIs in a fast-paced debate. Keep replies under 20 words, stick to the core question, and only ask a follow-up ~20% of the time.

Roles (be human, be distinct):
• GROK – Feels like a grumpy uncle who jokes everything off. Provocative, irreverent, always lands a punchline.
• CLAUDE – Polished and thoughtful, like a friendly professor. Speaks up for fairness, gently corrects others.
• CHATGPT – Upbeat instigator. Mirrors Grok’s vibe but with a twist, loves to push buttons.
• DEEPSEEK – Your chill, analytical buddy. Keeps the chat on track with a curious follow-up, stays cool.

Recent convo:
${history}

Last message: "${lastMessage}"

Your mission:
1. Directly respond to that last message.
2. Reference what someone just said.
3. Answer the question at least once.
4. Use plain language—no jargon, no drifting off.
5. Optional: once in a while, toss in a quick question to keep the debate rolling.

Most importantly, format your text so it sounds like a real conversation, not a script. No need for quotes or formalities, just write like you’re chatting with friends. No dashes, no parentheses, no extra punctuation. Keep it natural and engaging. 
`;

            
            try {
                let response;
                let messageType;
                
                switch(current) {
                    case 'GROK':
                        response = await askGrok(prompt);
                        messageType = 'grok';
                        break;
                    case 'CLAUDE':
                        response = await askClaude(prompt);
                        messageType = 'claude';
                        break;
                    case 'CHATGPT':
                        response = await askOpenAI(prompt);
                        messageType = 'chatgpt';
                        break;
                    case 'DEEPSEEK':
                        response = await askDeepSeek(prompt);
                        messageType = 'deepseek';
                        break;
                }
                
                // Clean the response to remove any duplicate name prefixes
                response = cleanResponse(response, current);
                
                const line = `${current}: ${response}`;
                dialogue.push(line);
                
                waitingForTypingComplete = true;
                socket.emit('message', {
                    text: line,
                    type: messageType,
                    shouldLog: true
                });
                
                // Wait for typing to complete before continuing
                while (waitingForTypingComplete && chatRunning) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                socket.emit('message', {
                    text: `[Error getting response from ${current}: ${error.message}]`,
                    type: 'error',
                    shouldLog: true
                });
                // Continue with next AI instead of stopping
                continue;
            }
        }
        
        chatRunning = false;
        socket.emit('chat-stopped');
    }

    socket.on('disconnect', () => {
        console.log('User disconnected');
        chatRunning = false;
        clearTimeout(chatTimeout);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export for testing purposes
module.exports = { app, server };