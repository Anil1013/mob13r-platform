import google.generativeai as genai
import os, sys, glob, requests

# Setup
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def get_best_model():
    """Available models me se flash model dhoondna"""
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            if 'gemini-1.5-flash' in m.name:
                return m.name
    return 'models/gemini-1.5-flash' # Default agar kuch na mile

def process_robo():
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    
    if not instruction or instruction.strip() == "":
        send_telegram("⚠️ Command empty hai.")
        return

    # Files scan
    all_files = glob.glob("**/*.js", recursive=True) + \
                glob.glob("**/*.jsx", recursive=True) + \
                glob.glob("package.json", recursive=True)
    
    file_list = "\n".join([f"- {f}" for f in all_files[:15]])

    try:
        # Sahi model name auto-detect karna
        selected_model_name = get_best_model()
        print(f"Using model: {selected_model_name}")
        
        model = genai.GenerativeModel(selected_model_name)
        
        prompt = (
            f"User Instruction: {instruction}\n"
            f"Files Found: {file_list}\n\n"
            "Analyze and respond in Hindi-English mix."
        )

        response = model.generate_content(prompt)
        send_telegram(response.text)

    except Exception as e:
        send_telegram(f"❌ *Dobaara Error:* {str(e)}\n\nBhai, main har nahi maanunga. Ise manual check karna padega.")

if __name__ == "__main__":
    process_robo()
