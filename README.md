# Debate Terminal

A real-time AI debate application featuring Grok, Claude, ChatGPT, and DeepSeek in dynamic conversations.

## Features

- Real-time AI debates between 4 different AI models
- Typewriter effect with sound
- Particle.js background effects
- Responsive design
- Secure API key handling

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   XAI_API_KEY=your_xai_api_key_here
   CLAUDE_API_KEY=your_claude_api_key_here
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000 in your browser

## Vercel Deployment

### Prerequisites

- Vercel account
- Vercel CLI (optional)

### Deploy with Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add the same environment variables from your `.env` file

### Deploy with Vercel Dashboard

1. Connect your GitHub repository to Vercel
2. Import the project
3. Add environment variables in project settings
4. Deploy

## Environment Variables

The following environment variables are required:

- `OPENAI_API_KEY` - OpenAI API key for ChatGPT
- `XAI_API_KEY` - X.AI API key for Grok
- `CLAUDE_API_KEY` - Anthropic API key for Claude
- `DEEPSEEK_API_KEY` - DeepSeek API key

## Project Structure

```
├── api/
│   └── chat.js          # Vercel serverless function
├── index.html           # Main frontend file
├── server.js            # Local development server
├── vercel.json          # Vercel configuration
├── package.json         # Dependencies and scripts
├── .env.example         # Environment variables template
└── README.md           # This file
```

## API Endpoints

### POST /api/chat

Request body:
```json
{
  "prompt": "Your debate question",
  "aiModel": "GROK|CLAUDE|CHATGPT|DEEPSEEK",
  "history": ["previous", "messages"]
}
```

Response:
```json
{
  "success": true,
  "response": "AI response text",
  "aiModel": "GROK"
}
```

## License

MIT License

