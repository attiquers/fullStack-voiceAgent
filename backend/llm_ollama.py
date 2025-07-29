from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage

def get_response(user_input: str) -> str:
    # Instruction prompt for TTS-friendly assistant tone
    instruction = (
        "You are a voice assistant. Your response will be spoken aloud using TTS, "
        "so keep it friendly, conversational, and short. Use natural language.\n\n"
        f"User said: {user_input}\n\n"
        "Assistant reply:"
    )

    llm = ChatOllama(model="gemma3:1b")  # Make sure this model is pulled via `ollama pull gemma:3b`

    message = HumanMessage(content=instruction)
    return llm.invoke([message]).content
