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
    """Telegram par status update bhejne ke liye"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 Mob13r-AI: {message}"}
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Telegram Error: {e}")

def get_last_instruction():
    """Telegram se aapka aakhri message uthane ke liye"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    try:
        res = requests.get(url).json()
        if res.get('result'):
            # Sabse latest message uthate hain
            last_msg = res['result'][-1]['message']['text']
            # Agar sirf /start ya commands hain toh ignore karte hain
            if last_msg.lower() in ['/start', 'fix', 'deploy']:
                return None
            return last_msg
    except Exception as e:
        print(f"Error fetching updates: {e}")
    return None

def process_ai_update():
    instruction = get_last_instruction()
    
    if not instruction:
        print("No new instruction found.")
        return

    send_telegram_log(f"Aapki instruction mili: '{instruction}'. Files analyze ho rahi hain...")

    # Sirf kaam ki files scan karenge (node_modules ignore rahega .gitignore se)
    # Backend aur Frontend dono cover honge
    files = glob.glob("backend/**/*.js", recursive=True) + \
            glob.glob("frontend/src/**/*.js", recursive=True) + \
            glob.glob("frontend/src/**/*.jsx", recursive=True)

    updated_files = []

    for path in files:
        try:
            with open(path, 'r') as f:
                original_code = f.read()

            # AI Prompt: Instruction + Code context
            prompt = (
                f"You are a Senior Full-stack Developer. User Instruction: {instruction}\n"
                f"File Path: {path}\n"
                f"Current Code:\n{original_code}\n\n"
                f"Task: Update the code according to the instruction. "
                f"If the instruction doesn't apply to this file, return the original code exactly. "
                f"Return ONLY the updated code without any backticks, markdown, or explanations."
            )

            response = model.generate_content(prompt)
            # Code clean-up (extra markdown hatane ke liye)
            new_code = response.text.strip().lstrip("```javascript").lstrip("```").rstrip("```").strip()

            if new_code != original_code and len(new_code) > 10:
                with open(path, 'w') as f:
                    f.write(new_code)
                updated_files.append(path)
                print(f"Updated: {path}")

        except Exception as e:
            print(f"Error processing {path}: {e}")

    if updated_files:
        files_list = ", ".join([os.path.basename(f) for f in updated_files])
        send_telegram_log(f"✅ In files mein badlav kar diye gaye hain: {files_list}. Ab main GitHub par push kar raha hoon...")
    else:
        send_telegram_log("ℹ️ Kisi file mein badlav ki zaroorat nahi padi. Sab kuch theek hai!")

if __name__ == "__main__":
    process_ai_update()
