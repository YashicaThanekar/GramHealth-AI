# GramHealth AI Backend

Flask backend API for symptom analysis using OpenRouter AI models.

## Setup

1. **Install Python dependencies:**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenRouter API key:
   - Get free API key from: https://openrouter.ai/keys
   - Browse models at: https://openrouter.ai/models

   **Recommended Models:**
   - **Free**: `meta-llama/llama-3.1-8b-instruct:free` (default)
   - **Free**: `google/gemma-2-9b-it:free`
   - **Paid**: `anthropic/claude-3.5-sonnet` (best quality)
   - **Paid**: `openai/gpt-4o` (excellent for medical)

3. **Run the server:**

   ```bash
   python app.py
   ```

   Server will run on `http://localhost:5000`

## API Endpoints

### `POST /api/analyze-symptoms`

Analyze patient symptoms and return urgency level and advice.

**Request:**

```json
{
  "symptoms": "I have fever and headache for 2 days"
}
```

**Response:**

```json
{
  "urgency": "medium",
  "urgencyText": "Medium - Consult Soon",
  "advice": "Your symptoms need attention. Please consult a doctor within 24-48 hours.",
  "color": "#f59e0b",
  "disclaimer": "This is not a medical diagnosis. Please consult a qualified doctor."
}
```

## Features

- ✅ AI-powered symptom analysis using OpenRouter (access to 100+ models)
- ✅ Support for free models (Llama 3.1, Gemma 2) and premium models (Claude, GPT-4)
- ✅ Fallback rule-based analysis (works without API key)
- ✅ CORS enabled for frontend integration
- ✅ JSON API responses
- ✅ Error handling and automatic fallback
- ✅ High token limits for detailed medical analysis

## Production Deployment

Deploy to Render, Railway, or any platform supporting Python:

```bash
gunicorn app:app
```
