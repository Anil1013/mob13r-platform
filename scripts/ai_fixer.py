import os, sys, glob, requests, json

# 1. Configuration
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def process_robo():
    # Message uthana
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    if not instruction:
        send_telegram("⚠️ Command nahi mili.")
        return

    # Files scan karna
    all_files = glob.glob("**/*.js", recursive=True) + glob.glob("**/*.jsx", recursive=True)
    file_list = "\n".join([f"- {f}" for f in all_files[:15]])

    # 2. Google Gemini Direct API Call (v1beta version)
    # Isme SDK ki zaroorat nahi padti
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{"text": f"User Instruction: {instruction}\n\nFiles in repo:\n{file_list}\n\nRespond in Hindi-English mix."}]
        }]
    }
    
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(api_url, headers=headers, data=json.dumps(payload))
        res_data = response.json()

        # Success check
        if "candidates" in res_data:
            ai_text = res_data['candidates'][0]['content']['parts'][0]['text']
            send_telegram(ai_text)
        else:
            # Agar koi error aaye toh detail dikhao
            err_msg = res_data.get('error', {}).get('message', 'Unknown API Error')
            send_telegram(f"❌ *API Error:* {err_msg}\n\nBhai, ek baar GitHub Secrets mein apni API key check karo.")

    except Exception as e:
        send_telegram(f"❌ *System Failure:* {str(e)}")

if __name__ == "__main__":
    process_robo()
