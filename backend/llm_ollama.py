from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage

def get_response(user_input: str) -> str:
    # Instruction prompt for TTS-friendly assistant tone
    instruction = (
        "You are a voice assistant. Your response will be spoken aloud using TTS, so do NOT use any emojis, special characters, or formatting like asterisks, underscores, or bullet points. "
        "Avoid anything that would sound unnatural or awkward when spoken aloud. Just speak in clear, simple, friendly sentences.\n\n"
        f"User said: {user_input}\n\n"
        "Assistant reply:"
    )


    llm = ChatOllama(model="gemma3:1b")  # Make sure this model is pulled via `ollama pull gemma:3b`

    message = HumanMessage(content=instruction)
    return llm.invoke([message]).content
