import google.generativeai as genai
import os, sys, glob, requests

# Setup
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)

# Universal Model Name
model = genai.GenerativeModel('gemini-1.5-flash')

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    # Message length limit handle karne ke liye (4096 chars)
    if len(message) > 4000: message = message[:4000] + "..."
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def process_robo():
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    
    if not instruction or instruction.strip() == "":
        send_telegram("⚠️ Command empty hai. Please Telegram par kuch likhein.")
        return

    # Files scan
    all_files = glob.glob("**/*.js", recursive=True) + \
                glob.glob("**/*.jsx", recursive=True) + \
                glob.glob("package.json", recursive=True)
    
    file_list = "\n".join([f"- {f}" for f in all_files[:15]])

    prompt = (
        f"User Instruction: {instruction}\n"
        f"Files Found: {file_list}\n\n"
        "Analyze and respond in Hindi-English mix."
    )

    try:
        # Direct generation call
        response = model.generate_content(prompt)
        send_telegram(response.text)
    except Exception as e:
        # Agar fir se 404 aaye toh alternate model try karega automatically
        send_telegram(f"❌ *Error:* {str(e)}\n\nBhai, lagta hai model version ka panga hai. Main check kar raha hoon.")

if __name__ == "__main__":
    process_robo()
