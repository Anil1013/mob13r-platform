import google.generativeai as genai
import os, sys, glob, requests

# Setup Secrets
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def process_robo():
    # Message uthane ke do raaste: Command line ya Environment variable
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    
    if not instruction or instruction.strip() == "":
        send_telegram("⚠️ Mujhe koi command nahi mili. Re-triggering...")
        return

    # Repo scan (sari files dhoondna)
    all_files = glob.glob("**/*.js", recursive=True) + \
                glob.glob("**/*.jsx", recursive=True) + \
                glob.glob("package.json", recursive=True)
    
    file_list_text = "\n".join([f"- {f}" for f in all_files[:15]])

    # AI Prompt (Asli Brain)
    prompt = (
        f"User Query: {instruction}\n"
        f"Files Found in Repo:\n{file_list_text}\n\n"
        "Instructions:\n"
        "1. Answer the user query in a friendly Hindi-English mix.\n"
        "2. If they asked about files, list them.\n"
        "3. If they asked to fix/change code, explain the plan.\n"
        "4. Be very descriptive, don't give short answers."
    )

    try:
        response = model.generate_content(prompt)
        if response.text:
            send_telegram(response.text)
        else:
            send_telegram("⚠️ Gemini is thinking but didn't speak. Check API quota.")
    except Exception as e:
        send_telegram(f"❌ Analysis Error: {str(e)}")

if __name__ == "__main__":
    process_robo()
