# Deployment Instructions

## Vercel Deployment

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project directory**
   ```bash
   vercel
   ```
   - Follow the prompts to configure your project
   - Choose "Yes" when asked to link to existing project or create new one
   - Select your preferred settings

4. **Set Environment Variables**
   After deployment, set your environment variables:
   ```bash
   vercel env add OPENAI_API_KEY
   vercel env add XAI_API_KEY
   vercel env add CLAUDE_API_KEY
   vercel env add DEEPSEEK_API_KEY
   ```
   
   Or set them in the Vercel dashboard:
   - Go to your project dashboard
   - Navigate to Settings → Environment Variables
   - Add each API key for Production, Preview, and Development environments

5. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Method 2: Vercel Dashboard

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `npm install`

3. **Add Environment Variables**
   - In project settings, go to Environment Variables
   - Add all four API keys:
     - `OPENAI_API_KEY`
     - `XAI_API_KEY`
     - `CLAUDE_API_KEY`
     - `DEEPSEEK_API_KEY`

4. **Deploy**
   - Click "Deploy"
   - Your app will be available at the provided URL

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd debateterminal
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys.

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   
4. **Access Application**
   Open http://localhost:3000

## Project Structure for Vercel

```
debateterminal/
├── api/
│   └── chat.js          # Vercel serverless function
├── index.html           # Main page (served at root)
├── fist.ico            # Favicon
├── particles.min.js    # Particles library
├── type.mp3           # Typing sound effect
├── server.js          # Local development server
├── vercel.json        # Vercel configuration
├── package.json       # Dependencies
├── .env.example       # Environment template
├── .gitignore         # Git ignore rules
└── README.md          # Documentation
```

## Important Notes

### Security
- API keys are securely stored as environment variables
- Never commit `.env` file to version control
- Frontend code doesn't contain any API keys

### API Endpoints
- Production: `https://your-app.vercel.app/api/chat`
- Local: `http://localhost:3000/api/chat`

### Troubleshooting

1. **API Errors**
   - Verify all environment variables are set correctly
   - Check API key validity and quotas
   - Monitor Vercel function logs

2. **Build Failures**
   - Ensure `package.json` has correct dependencies
   - Check Node.js version compatibility

3. **CORS Issues**
   - API function includes proper CORS headers
   - Should work from any domain

### Performance
- Serverless functions have cold start delays
- Rate limiting implemented to prevent API abuse
- Consider upgrading Vercel plan for production use

## Support
- Check Vercel documentation for deployment issues
- Verify API provider documentation for API-specific problems

