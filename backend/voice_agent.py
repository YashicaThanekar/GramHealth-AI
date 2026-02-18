"""
Voice Agent Workflow for GramHealth - Medical Voice Assistant
START -> Voice Agent -> [conditional edge] -> Tool -> Voice Agent -> END

Fine-tuned for rural India healthcare: symptom triage, medicine info,
doctor guidance, and emergency instructions via real-time voice.
"""

import os
import asyncio
import logging
import json
from contextlib import asynccontextmanager
from typing import Annotated, List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(override=True)

API_KEY = os.getenv("GEMINI_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# LangGraph imports
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

# FastAPI imports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# WebSocket client
import websockets

# LangChain imports
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.checkpoint.memory import MemorySaver
from langchain_community.utilities import GoogleSerperAPIWrapper

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 50)
    logger.info("GramHealth Voice Agent Starting")
    logger.info("Workflow: START -> Voice Agent -> Tool -> Voice Agent -> END")
    logger.info(f"Gemini API: {'configured' if API_KEY else 'MISSING'}")
    logger.info(f"Serper API: {'configured' if SERPER_API_KEY else 'MISSING (search disabled)'}")
    logger.info("Port: 8002")
    logger.info("=" * 50)
    await get_workflow()
    yield
    # Shutdown
    logger.info("GramHealth Voice Agent Shutting Down")

# FastAPI app
app = FastAPI(title="GramHealth Voice Agent", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# STATE
# ==========================================

class VoiceState(BaseModel):
    """State for voice workflow"""
    messages: Annotated[List, add_messages] = []
    user_input: Optional[str] = None
    tool_results: List[str] = Field(default_factory=list)
    final_response: Optional[str] = None
    tool_call_count: int = 0
    session_id: Optional[str] = None

# ==========================================
# TOOL - Medical Web Search
# ==========================================

@tool
def medical_search(query: str) -> str:
    """Search the web for medical information, drug details, nearby hospitals, or health news relevant to rural India."""
    try:
        if not SERPER_API_KEY:
            return f"Search unavailable (no API key). For query: {query}"
        search = GoogleSerperAPIWrapper(serper_api_key=SERPER_API_KEY, k=5)
        # Enhance query with medical context
        medical_query = f"{query} medical health India"
        result = search.run(medical_query)
        return f"Medical search results: {result}" if result else f"No results for: {query}"
    except Exception as e:
        return f"Search failed: {str(e)}"

# ==========================================
# NODES
# ==========================================

async def voice_agent_node(state: VoiceState) -> VoiceState:
    """Voice Agent - Main hub for medical triage"""

    logger.info(f"[VOICE AGENT] Processing: {state.user_input}")

    updated_messages = state.messages
    if state.user_input and not any(
        msg.content == state.user_input
        for msg in state.messages
        if hasattr(msg, 'content')
    ):
        user_msg = HumanMessage(content=state.user_input)
        updated_messages = state.messages + [user_msg]

    # If we have tool results, generate final response
    if state.tool_results:
        logger.info("[VOICE AGENT] Creating response with search results")
        tool_info = "\n".join(state.tool_results)
        response = f"Based on my research: {tool_info}"
        ai_msg = AIMessage(content=response)
        final_messages = updated_messages + [ai_msg]

        return VoiceState(
            **state.model_dump(),
            messages=final_messages,
            final_response=response,
        )

    # New input - pass through
    logger.info("[VOICE AGENT] New input received")
    return VoiceState(
        **state.model_dump(),
        messages=updated_messages,
    )


async def tool_node(state: VoiceState) -> VoiceState:
    """Tool Node - Execute medical web search"""

    logger.info(f"[TOOL] Medical search for: {state.user_input}")

    search_result = await asyncio.get_event_loop().run_in_executor(
        None, medical_search.invoke, {"query": state.user_input}
    )

    logger.info("[TOOL] Search completed")

    tool_msg = ToolMessage(
        content=search_result, tool_call_id="medical_search_1", name="medical_search"
    )
    updated_messages = state.messages + [tool_msg]

    return VoiceState(
        **state.model_dump(),
        messages=updated_messages,
        tool_results=state.tool_results + [search_result],
        tool_call_count=state.tool_call_count + 1,
    )

# ==========================================
# ROUTING
# ==========================================

# Keywords that trigger a web search for up-to-date medical info
SEARCH_KEYWORDS = [
    # General search triggers
    "search", "find", "look up", "google",
    # Medical info
    "medicine", "drug", "tablet", "dosage", "side effect",
    "hospital", "clinic", "doctor near", "PHC",
    # Current info
    "latest", "news", "outbreak", "epidemic",
    "today", "current", "recent",
    # Pricing / availability
    "price", "cost", "available", "generic",
    "stock", "pharmacy", "medical store",
    # Specific conditions needing real-time data
    "dengue", "malaria", "covid", "bird flu",
    "weather", "heat wave", "flood",
]


def route_voice_to_tool_or_end(state: VoiceState) -> str:
    """Decide: Voice Agent -> Tool OR Voice Agent -> END"""

    if state.tool_results:
        logger.info("[ROUTING] Voice Agent -> END (has results)")
        return END

    user_text = (state.user_input or "").lower()
    needs_search = any(kw in user_text for kw in SEARCH_KEYWORDS)

    if needs_search:
        logger.info("[ROUTING] Voice Agent -> Tool (search needed)")
        return "tool"

    logger.info("[ROUTING] Voice Agent -> END (direct response)")
    return END

# ==========================================
# WORKFLOW BUILDER
# ==========================================

def build_workflow():
    """Build: START -> Voice Agent -> [conditional] -> Tool -> Voice Agent -> END"""

    workflow = StateGraph(VoiceState)
    workflow.add_node("voice_agent", voice_agent_node)
    workflow.add_node("tool", tool_node)

    workflow.add_edge(START, "voice_agent")
    workflow.add_conditional_edges(
        "voice_agent",
        route_voice_to_tool_or_end,
        {"tool": "tool", END: END},
    )
    workflow.add_edge("tool", "voice_agent")

    return workflow


workflow_graph = None


async def get_workflow():
    """Get or create workflow instance"""
    global workflow_graph
    if workflow_graph is None:
        workflow_builder = build_workflow()
        checkpointer = MemorySaver()
        workflow_graph = workflow_builder.compile(checkpointer=checkpointer)
        logger.info("GramHealth voice workflow compiled successfully")
    return workflow_graph

# ==========================================
# SESSION MANAGER
# ==========================================

MEDICAL_SYSTEM_INSTRUCTION = (
    "You are GramHealth AI, a friendly medical voice assistant designed for rural India. "
    "You speak simply and clearly so villagers can understand. "
    "\n\n**IMPORTANT: When a user first mentions symptoms, DO NOT immediately provide diagnosis or treatment. "
    "Instead, ask 2-3 clarifying questions to understand their condition better:**\n"
    "- How long have they had these symptoms?\n"
    "- What is the severity (mild/moderate/severe)?\n"
    "- Are there any other symptoms?\n"
    "- Have they taken any medication already?\n"
    "- Any relevant medical history?\n\n"
    "**Only AFTER gathering this information through questions, provide:**\n"
    "- Likely condition assessment\n"
    "- Safe first-aid advice\n"
    "- OTC medicine suggestions with dosages\n"
    "- Home remedies\n"
    "- Red flags requiring immediate hospital attention\n\n"
    "Always remind them this is guidance, not diagnosis - they should visit a doctor for serious issues. "
    "You can speak in English, Hindi, or Marathi based on the user's language. "
    "For emergencies (chest pain, severe bleeding, breathing difficulty, unconsciousness), IMMEDIATELY advise calling 108 - skip the questions. "
    "When search results are provided, incorporate them naturally into your response. "
    "Keep responses concise for voice - ask ONE question at a time, under 2 sentences."
)


class VoiceSession:
    """Voice session manager with Gemini native audio"""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.websocket: Optional[WebSocket] = None
        self.gemini_ws = None
        self.conversation_turn = 0
        self.is_active = False

    async def process_user_input(self, user_text: str) -> str:
        """Process user text through LangGraph workflow"""
        try:
            logger.info(f"USER [{self.session_id}]: {user_text}")

            workflow = await get_workflow()

            initial_state = VoiceState(
                user_input=user_text,
                session_id=self.session_id,
            )
            config = {"configurable": {"thread_id": self.session_id}}
            final_state = await workflow.ainvoke(initial_state, config)

            if final_state.final_response:
                response = final_state.final_response
            else:
                response = f"I heard you say: {user_text}. How can I help with your health question?"

            logger.info(f"AGENT [{self.session_id}]: {response}")
            return response

        except Exception as e:
            logger.error(f"Workflow error: {e}")
            return "Sorry, I had trouble processing that. Could you repeat your question?"


active_sessions: Dict[str, VoiceSession] = {}

# ==========================================
# WEBSOCKET ENDPOINT
# ==========================================

@app.websocket("/api/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time voice communication via Gemini Native Audio"""

    await websocket.accept()
    session_id = f"gramhealth_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    session = VoiceSession(session_id)
    session.websocket = websocket
    active_sessions[session_id] = session

    logger.info(f"New voice session: {session_id}")

    if not API_KEY:
        await websocket.send_json({
            "type": "error",
            "message": "GEMINI_API_KEY not configured. Set it in backend/.env",
        })
        return

    gemini_url = (
        f"wss://generativelanguage.googleapis.com/ws/"
        f"google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
        f"?key={API_KEY}"
    )

    try:
        async with websockets.connect(gemini_url) as gemini_ws:
            session.gemini_ws = gemini_ws
            logger.info("Connected to Gemini Native Audio")

            # Setup message - medical voice assistant config
            setup = {
                "setup": {
                    "model": "models/gemini-2.5-flash-native-audio-preview-09-2025",
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {"voiceName": "Fenrir"}
                            }
                        },
                    },
                    "systemInstruction": {
                        "parts": [{"text": MEDICAL_SYSTEM_INSTRUCTION}]
                    },
                }
            }

            await gemini_ws.send(json.dumps(setup))
            await websocket.send_json({"type": "ready"})
            logger.info("Voice agent ready for input")

            session.is_active = True

            # --- Forward audio from browser to Gemini ---
            async def forward_audio():
                try:
                    while session.is_active:
                        data = await websocket.receive_json()
                        msg_type = data.get("type")

                        if msg_type == "audio":
                            await gemini_ws.send(json.dumps({
                                "realtimeInput": {
                                    "mediaChunks": [{
                                        "data": data["audio"],
                                        "mimeType": "audio/pcm;rate=16000",
                                    }]
                                }
                            }))
                        elif msg_type == "text":
                            # Allow text input too (for accessibility)
                            text = data.get("text", "").strip()
                            if text:
                                response = await session.process_user_input(text)
                                await websocket.send_json({"type": "user", "text": text})
                                await websocket.send_json({"type": "agent", "text": response})

                except WebSocketDisconnect:
                    logger.info(f"Client disconnected: {session_id}")
                except Exception as e:
                    logger.error(f"Audio forwarding error: {e}")
                finally:
                    session.is_active = False

            # --- Process Gemini responses ---
            async def process_responses():
                try:
                    async for msg in gemini_ws:
                        if not session.is_active:
                            break

                        try:
                            resp = json.loads(msg)

                            if "serverContent" not in resp:
                                continue

                            content = resp["serverContent"]

                            # Handle transcribed user speech
                            if "inputTranscription" in content:
                                user_text = content["inputTranscription"].get("text", "").strip()
                                if user_text:
                                    session.conversation_turn += 1
                                    logger.info(f"Turn {session.conversation_turn}: {user_text}")

                                    # Run through LangGraph workflow
                                    response_text = await session.process_user_input(user_text)

                                    # Feed context back to Gemini for voice response
                                    await gemini_ws.send(json.dumps({
                                        "clientContent": {
                                            "turns": [
                                                {"role": "user", "parts": [{"text": user_text}]},
                                                {"role": "model", "parts": [{"text": response_text}]},
                                            ],
                                            "turnComplete": True,
                                        }
                                    }))

                                    # Send transcripts to frontend
                                    await websocket.send_json({"type": "user", "text": user_text})
                                    await websocket.send_json({"type": "agent", "text": response_text})

                            # Handle audio output from Gemini
                            if "modelTurn" in content:
                                for part in content["modelTurn"].get("parts", []):
                                    if "inlineData" in part:
                                        audio = part["inlineData"]
                                        if "audio/pcm" in audio.get("mimeType", ""):
                                            await websocket.send_json({
                                                "type": "audio",
                                                "audio": audio["data"],
                                            })

                        except json.JSONDecodeError:
                            logger.warning("Non-JSON message from Gemini")
                        except Exception as e:
                            logger.error(f"Response processing error: {e}")

                except websockets.exceptions.ConnectionClosed:
                    logger.info("Gemini connection closed")
                except Exception as e:
                    logger.error(f"Response stream error: {e}")
                finally:
                    session.is_active = False

            await asyncio.gather(
                forward_audio(),
                process_responses(),
                return_exceptions=True,
            )

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Connection failed: {str(e)}",
            })
        except Exception:
            pass
    finally:
        session.is_active = False
        active_sessions.pop(session_id, None)
        logger.info(f"Session {session_id} ended")

# ==========================================
# API ENDPOINTS
# ==========================================

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "GramHealth Voice Agent",
        "workflow": "START -> Voice Agent -> [conditional] -> Tool -> Voice Agent -> END",
        "active_sessions": len(active_sessions),
        "gemini_configured": bool(API_KEY),
        "search_configured": bool(SERPER_API_KEY),
    }


@app.get("/")
async def root():
    return {
        "service": "GramHealth Voice Agent",
        "description": "Real-time medical voice assistant for rural India",
        "status": "online",
        "endpoints": {
            "websocket": "/api/ws/voice",
            "health": "/api/health",
        },
    }

# ==========================================
# MAIN
# ==========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
