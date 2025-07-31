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

// API Keys// filepath: c:\Users\Shray\Documents\terminal\index.js
// ...existing code...
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
// ...existing code...

// OpenAI API function
async function askOpenAI(prompt) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 1.0
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        throw new Error(`OpenAI error: ${error.message}`);
    }
}

// Grok API function
async function askGrok(prompt) {
    try {
        const response = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: 'grok-2-1212',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 2.0
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
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 150,
            temperature: 1.0,
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
        
        // Clear log file
        await clearLogFile();
        
        // Send initial prompt
        socket.emit('message', {
            text: `GROK: ${initialPrompt}`,
            type: 'grok',
            shouldLog: true
        });
        
        // Start the conversation loop
        runChat(socket, dialogue, GROK, CLAUDE, CHATGPT);
    });

    socket.on('stop-chat', () => {
        chatRunning = false;
        clearTimeout(chatTimeout);
        socket.emit('chat-stopped');
    });

    socket.on('typing-completed', () => {
        waitingForTypingComplete = false;
    });

    async function runChat(socket, dialogue, GROK, CLAUDE, CHATGPT) {
        const turns = 100;
        const ais = [CLAUDE, CHATGPT, GROK]; // Rotation order after initial Grok message
        
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
            
            const current = ais[i % 3];
            const history = dialogue.slice(-6).join('\n');
            const lastMessage = dialogue[dialogue.length - 1];
            
            const prompt = `You are ${current}. Keep responses under 20 words. ` +
                `You're in a philosophical debate with other AIs. Be distinctive to your personality:\n` +
                `- GROK: Witty, provocative, contrarian\n` +
                `- CLAUDE: Thoughtful, nuanced, balanced\n` +
                `- CHATGPT: Helpful, optimistic, practical\n\n` +
                `DIRECTLY RESPOND to this last message: "${lastMessage}"\n` +
                `Either disagree, build upon it, or challenge it from your AI's perspective. ` +
                `Make it feel like a real debate - reference what was just said!\n\n` +
                `Recent conversation:\n${history}\n\n` +
                `Your response (without prefixing your name):`;
            
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