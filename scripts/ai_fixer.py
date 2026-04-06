import google.generativeai as genai
import os
import glob
import requests

# Secrets fetch karna
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Gemini Setup
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def send_telegram_log(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": CHAT_ID, "text": f"🤖 Mob13r-Log: {message}"})

def fix_code():
    send_telegram_log("🔍 AI Fixer active! Files scan ki ja rahi hain...")
    
    # Backend aur Frontend files search karna
    files = glob.glob("backend/**/*.js", recursive=True) + glob.glob("frontend/src/**/*.js", recursive=True)
    
    if not files:
        send_telegram_log("❌ Koi JS files nahi mili check karne ke liye.")
        return

    fixed_count = 0
    for path in files:
        with open(path, 'r') as f:
            code = f.read()

        # AI ko instruction
        prompt = f"Fix any syntax errors or bugs in this code. Return ONLY the fixed code without any formatting or backticks:\n\n{code}"
        
        try:
            response = model.generate_content(prompt)
            fixed_code = response.text.replace("```javascript", "").replace("```", "").strip()
            
            # Agar code change hua hai tabhi save karein
            if fixed_code != code:
                with open(path, 'w') as f:
                    f.write(fixed_code)
                fixed_count += 1
                send_telegram_log(f"✅ File theek kar di gayi: {path}")
        except Exception as e:
            send_telegram_log(f"⚠️ Error in {path}: {str(e)}")

    if fixed_count > 0:
        send_telegram_log(f"🎉 Total {fixed_count} files fix ho gayi hain. Ab main ise GitHub par push kar raha hoon...")
    else:
        send_telegram_log("ℹ️ Sab kuch theek lag raha hai, koi badlav ki zaroorat nahi padi.")

if __name__ == "__main__":
    fix_code()
