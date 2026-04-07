import google.generativeai as genai
import os
import glob
import requests

# 1. Configuration & Secrets
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def send_telegram_log(message):
    """Telegram par status update aur analysis report bhejne ke liye"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 {message}", "parse_mode": "Markdown"}
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Telegram Error: {e}")

def get_last_instruction():
    """Telegram se aapka latest message uthane ke liye"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    try:
        res = requests.get(url).json()
        if res.get('result'):
            for item in reversed(res['result']):
                if 'message' in item and 'text' in item['message']:
                    return item['message']['text']
    except: return None
    return None

def process_ai_dev():
    instruction = get_last_instruction()
    if not instruction: return

    # Scan Files (Backend + Frontend)
    files = glob.glob("backend/**/*.js", recursive=True) + \
            glob.glob("frontend/src/**/*.js", recursive=True) + \
            glob.glob("frontend/src/**/*.jsx", recursive=True)

    # Filtering: Sirf wahi files dekho jo user ne message mein mention ki hain
    target_files = [f for f in files if any(word.lower() in f.lower() for word in instruction.split())]
    if not target_files: target_files = files[:5] # Default top 5 files agar kuch na mile

    for path in target_files:
        try:
            with open(path, 'r') as f:
                original_code = f.read()

            prompt = (
                f"User Instruction: {instruction}\n"
                f"File Path: {path}\n"
                f"Current Code:\n{original_code}\n\n"
                "Task:\n"
                "1. Pehle file ka analysis do (Hindi/English mix).\n"
                "2. Agar error hai toh batao.\n"
                "3. Agar code update karna hai toh pura code [FIXED_CODE] tag ke baad do.\n"
                "4. Agar koi change nahi chahiye, toh sirf explanation do."
            )

            response = model.generate_content(prompt).text
            
            # Split Analysis and Code
            parts = response.split("[FIXED_CODE]")
            explanation = parts[0].strip()
            
            # User ko explanation bhej rahe hain (Ye sabse zaroori hai)
            send_telegram_log(f"*Analysis for {os.path.basename(path)}:*\n\n{explanation}")

            if len(parts) > 1:
                new_code = parts[1].strip().replace("```javascript", "").replace("```jsx", "").replace("```", "").strip()
                if new_code != original_code and len(new_code) > 10:
                    with open(path, 'w') as f:
                        f.write(new_code)
                    send_telegram_log(f"✅ Maine {os.path.basename(path)} mein badlav kar diye hain. Ab deploy ho raha hai!")

        except Exception as e:
            print(f"Error on {path}: {e}")

if __name__ == "__main__":
    process_ai_dev()
