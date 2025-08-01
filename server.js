const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Import the chat handler from api/chat.js
const chatHandler = require('./api/chat.js');

// Route for API calls - proxy to the Vercel function
app.post('/api/chat', async (req, res) => {
    try {
        // Create a mock Vercel request/response object
        const mockReq = {
            method: 'POST',
            body: req.body
        };
        
        const mockRes = {
            status: (code) => ({
                json: (data) => res.status(code).json(data),
                end: () => res.status(code).end()
            }),
            json: (data) => res.json(data),
            setHeader: (name, value) => res.setHeader(name, value)
        };
        
        // Call the default export function
        await chatHandler.default(mockReq, mockRes);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Environment variables loaded:');
    console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
    console.log('- XAI_API_KEY:', process.env.XAI_API_KEY ? 'Set' : 'Not set');
    console.log('- CLAUDE_API_KEY:', process.env.CLAUDE_API_KEY ? 'Set' : 'Not set');
    console.log('- DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? 'Set' : 'Not set');
});

