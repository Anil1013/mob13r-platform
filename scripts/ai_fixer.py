import google.generativeai as genai
import os, sys, glob, requests

# Setup Secrets
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def process_robo():
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    
    if not instruction or instruction.strip() == "":
        send_telegram("⚠️ Command empty hai. Please kuch likhein.")
        return

    # Files scan
    all_files = glob.glob("**/*.js", recursive=True) + \
                glob.glob("**/*.jsx", recursive=True) + \
                glob.glob("package.json", recursive=True)
    
    file_list = "\n".join([f"- {f}" for f in all_files[:15]])

    # List of models to try (Sahi sequence mein)
    candidate_models = [
        'gemini-1.5-flash', 
        'gemini-pro', 
        'models/gemini-1.5-flash', 
        'models/gemini-pro'
    ]

    success = False
    for model_name in candidate_models:
        try:
            print(f"Trying model: {model_name}")
            model = genai.GenerativeModel(model_name)
            
            prompt = (
                f"User Instruction: {instruction}\n"
                f"Files Found: {file_list}\n\n"
                "Answer as a senior developer in Hindi-English mix."
            )

            response = model.generate_content(prompt)
            if response.text:
                send_telegram(response.text)
                success = True
                break # Agar chal gaya toh loop se bahar
        except Exception as e:
            print(f"Failed with {model_name}: {str(e)}")
            continue

    if not success:
        send_telegram("❌ *System Alert:* Saare models fail ho gaye hain. \n\nBhai, ek baar check karo ki aapne **Google AI Studio (aistudio.google.com)** se hi API key li hai na?")

if __name__ == "__main__":
    process_robo()
