import os, sys, glob, requests, json

# Configuration
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def process_robo():
    instruction = sys.argv[1] if len(sys.argv) > 1 else os.getenv("USER_MSG")
    if not instruction:
        send_telegram("⚠️ Command nahi mili.")
        return

    all_files = glob.glob("**/*.js", recursive=True) + glob.glob("**/*.jsx", recursive=True)
    file_list = "\n".join([f"- {f}" for f in all_files[:15]])

    # STABLE API URL (Using v1 instead of v1beta)
    api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key={GEMINI_KEY}"
    
    # Payload for gemini-pro (Stable model)
    payload = {
        "contents": [{
            "parts": [{"text": f"User Instruction: {instruction}\n\nFiles:\n{file_list}\n\nRespond in Hindi-English."}]
        }]
    }
    
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(api_url, headers=headers, data=json.dumps(payload))
        res_data = response.json()

        if "candidates" in res_data:
            ai_text = res_data['candidates'][0]['content']['parts'][0]['text']
            send_telegram(ai_text)
        else:
            # Agar gemini-pro bhi fail ho toh flash try karega
            flash_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={GEMINI_KEY}"
            response = requests.post(flash_url, headers=headers, data=json.dumps(payload))
            res_data = response.json()
            
            if "candidates" in res_data:
                ai_text = res_data['candidates'][0]['content']['parts'][0]['text']
                send_telegram(ai_text)
            else:
                err = res_data.get('error', {}).get('message', 'Model mismatch')
                send_telegram(f"❌ *Final API Error:* {err}\n\nBhai, Google AI Studio mein ek baar 'Model' check karo.")

    except Exception as e:
        send_telegram(f"❌ *System Error:* {str(e)}")

if __name__ == "__main__":
    process_robo()
