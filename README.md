# 🏥 GramHealth AI

A multilingual healthcare platform providing AI-powered symptom analysis, doctor appointments, medicine ordering, and voice-enabled health assistance for rural communities.

## ✨ Features

### 🤖 AI Health Assistant
- **Real-time Symptom Analysis**: AI-powered analysis using OpenRouter/Gemini
- **Voice Agent**: Voice-enabled health consultation via WebSocket
- **Urgency Detection**: Automatic triage (Low/Medium/High/Emergency)
- **Chat History**: Persistent conversation tracking

### 👨‍⚕️ Healthcare Services
- **Doctor Directory**: Browse and book appointments with verified doctors
- **Medicine Store**: Order medicines with stock management
- **Order Tracking**: Real-time order status updates
- **SOS Emergency**: Quick access emergency button

### 🌍 Multilingual Support
- **3 Languages**: English, Hindi (हिंदी), Marathi (मराठी)
- **Complete Translation**: All UI elements, medical terms, and responses
- **Easy Switching**: One-click language change

### 📱 Mobile Optimized
- **Responsive Design**: Optimized for all screen sizes
- **Touch-Friendly**: 44px minimum touch targets
- **Progressive Web App**: Offline support via service worker
- **Fast Loading**: Code-splitting and lazy loading

### 🔐 Authentication & Security
- **Firebase Auth**: Secure user authentication
- **Role-Based Access**: Admin and user roles
- **Protected Routes**: Secure admin dashboard
- **Environment Variables**: Sensitive data protection

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **Firebase Account** (for authentication & database)
- **API Keys** (OpenRouter, Gemini, Serper)

### 1️⃣ Clone Repository

```bash
git clone <your-repo-url>
cd GramHealth
```

### 2️⃣ Backend Setup

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux

# Edit .env file with your API keys
# OPENROUTER_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here
# SERPER_API_KEY=your_key_here

# Run Flask server
python app.py
```

Backend runs on `http://localhost:5000`

### 3️⃣ Voice Agent Setup (Optional)

```bash
cd backend
python voice_agent.py
```

Voice agent WebSocket runs on `ws://localhost:8002`

### 4️⃣ Frontend Setup

```bash
cd terna
npm install

# Optional: Configure frontend environment
copy .env.example .env.local  # Windows
# cp .env.example .env.local  # macOS/Linux

# Run development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## 📁 Project Structure

```
GramHealth/
├── backend/
│   ├── app.py              # Flask API server
│   ├── voice_agent.py      # FastAPI voice WebSocket
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment template
│
├── terna/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Admin pages
│   │   ├── locales/        # Translation files (en/hi/mr)
│   │   ├── App.jsx         # Main homepage
│   │   ├── Doctor.jsx      # Doctor directory
│   │   ├── Medicine.jsx    # Medicine store
│   │   ├── Cart.jsx        # Shopping cart
│   │   ├── MyOrders.jsx    # Order history
│   │   ├── AskAI.jsx       # AI chat interface
│   │   ├── VoiceAgent.jsx  # Voice consultation
│   │   └── firebase.js     # Firebase config
│   │
│   ├── public/
│   │   └── sw.js           # Service worker
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## 🔑 API Keys Setup

### OpenRouter (AI Chat)
1. Sign up at [openrouter.ai](https://openrouter.ai/)
2. Get API key from [Keys page](https://openrouter.ai/keys)
3. Add to `backend/.env`: `OPENROUTER_API_KEY=sk-or-v1-...`

### Gemini (Voice Agent)
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `backend/.env`: `GEMINI_API_KEY=...`

### Serper (Web Search)
1. Sign up at [serper.dev](https://serper.dev/)
2. Get API key from dashboard
3. Add to `backend/.env`: `SERPER_API_KEY=...`

### Firebase (Auth & Database)
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password, Google)
3. Create **Firestore Database**
4. Update `terna/src/firebase.js` with your config

## 🛠️ Tech Stack

### Frontend
- **React 19** + **Vite 7** - Fast modern development
- **React Router 7** - Client-side routing
- **Firebase** - Authentication & Firestore database
- **i18n** - Multilingual support

### Backend
- **Flask 3** - REST API server
- **FastAPI** - WebSocket voice agent
- **LangGraph** - AI workflow orchestration
- **OpenRouter** - Multi-model AI access
- **Gemini** - Voice agent AI

### DevOps
- **Git** - Version control
- **npm/pip** - Package management
- **Service Worker** - Offline support

## 📱 Build for Production

### Frontend
```bash
cd terna
npm run build
npm run preview  # Test production build
```

### Backend
```bash
# Use production WSGI server
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🔒 Security Notes

- ⚠️ **Never commit `.env` files** - Already excluded in `.gitignore`
- ⚠️ **Firebase config in `firebase.js` is safe** - Client-side keys are meant to be public
- ✅ **API keys use environment variables** - Keep `.env` files private
- ✅ **Role-based access control** - Admin routes protected

## 🌐 Deployment

### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Set build command: `cd terna && npm run build`
3. Set publish directory: `terna/dist`
4. Add environment variables if needed

### Backend (Railway/Render)
1. Connect GitHub repository
2. Select `backend` folder
3. Add environment variables (API keys)
4. Deploy!

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Open Pull Request

## 📄 License

This project is for educational purposes. Modify as needed.

## 🆘 Support

For issues or questions, please open a GitHub issue.

## 🙏 Acknowledgments

- OpenRouter for AI model access
- Firebase for backend infrastructure
- React & Vite communities
- Rural healthcare workers inspiration

---

**Built with ❤️ for rural healthcare accessibility**
