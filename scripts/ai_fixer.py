import google.generativeai as genai
import os, sys, glob, requests

# Setup Secrets
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)

# FIXED: Added 'models/' prefix to avoid 404 error
model = genai.GenerativeModel('models/gemini-1.5-flash')

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def process_robo():
    # Instruction fetch karna
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    
    if not instruction or instruction.strip() == "":
        send_telegram("⚠️ Mujhe koi command nahi mili. Re-triggering...")
        return

    # Repo scan
    all_files = glob.glob("**/*.js", recursive=True) + \
                glob.glob("**/*.jsx", recursive=True) + \
                glob.glob("package.json", recursive=True)
    
    file_list_text = "\n".join([f"- {f}" for f in all_files[:15]])

    # Prompt
    prompt = (
        f"User Query: {instruction}\n"
        f"Files Found in Repo:\n{file_list_text}\n\n"
        "Instructions:\n"
        "1. Answer in friendly Hindi-English mix.\n"
        "2. Explain what files you see and answer the query."
    )

    try:
        # API call
        response = model.generate_content(prompt)
        if response.text:
            send_telegram(response.text)
        else:
            send_telegram("⚠️ Gemini ne koi text generate nahi kiya. Check safety settings.")
    except Exception as e:
        # User ko error ki detail dena
        send_telegram(f"❌ *Analysis Error:* \n`{str(e)}`")

if __name__ == "__main__":
    process_robo()
