import os, sys, glob, requests, json

# Configuration
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo (Gemini 3 Flash):* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def process_robo():
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    if not instruction:
        send_telegram("⚠️ Command empty hai.")
        return

    # Files scan
    all_files = glob.glob("**/*.js", recursive=True) + glob.glob("**/*.jsx", recursive=True)
    file_list = "\n".join([f"- {f}" for f in all_files[:15]])

    # EXACT MODEL NAME from your screenshot
    model_id = "gemini-3-flash-preview"
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={GEMINI_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{"text": f"User Instruction: {instruction}\n\nFiles in repo:\n{file_list}\n\nRespond in friendly Hindi-English mix."}]
        }]
    }
    
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(api_url, headers=headers, json=payload)
        res_data = response.json()

        if "candidates" in res_data:
            ai_text = res_data['candidates'][0]['content']['parts'][0]['text']
            send_telegram(ai_text)
        else:
            # Agar ab bhi error aaye toh poora detail dikhao
            err_msg = res_data.get('error', {}).get('message', 'Model ID mismatch')
            send_telegram(f"❌ *Gemini 3 Error:* {err_msg}")

    except Exception as e:
        send_telegram(f"❌ *System Error:* {str(e)}")

if __name__ == "__main__":
    process_robo()
