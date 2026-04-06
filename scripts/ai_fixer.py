import google.generativeai as genai
import os
import glob
import requests

# Secrets fetch karna
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def get_last_telegram_message():
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    response = requests.get(url).json()
    if response['result']:
        # Last message uthana (e.g., "Add login route" ya "Hindi me comment likho")
        return response['result'][-1]['message']['text']
    return None

def send_telegram_log(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": CHAT_ID, "text": f"🤖 Mob13r-Update: {message}"})

def update_code_with_ai():
    user_instruction = get_last_telegram_message()
    if not user_instruction:
        return

    send_telegram_log(f"📝 Aapki instruction mili: '{user_instruction}'. Code update ho raha hai...")

    # Sirf main files scan karega (node_modules ko chhod kar)
    files = glob.glob("backend/**/*.js", recursive=True) + glob.glob("frontend/src/**/*.js", recursive=True)
    
    updated_files = []
    for path in files:
        with open(path, 'r') as f:
            original_code = f.read()

        # AI Prompt: Instruction + Code
        prompt = (
            f"User Instruction: {user_instruction}\n"
            f"Code in file {path}:\n{original_code}\n\n"
            f"Task: If the instruction applies to this file, update the code. "
            f"If not, return the original code exactly. "
            f"Return ONLY the code without any markdown or explanations."
        )
        
        try:
            response = model.generate_content(prompt)
            new_code = response.text.replace("```javascript", "").replace("```", "").strip()
            
            if new_code != original_code:
                with open(path, 'w') as f:
                    f.write(new_code)
                updated_files.append(path)
        except Exception as e:
            print(f"Error in {path}: {e}")

    if updated_files:
        send_telegram_log(f"✅ In files ko update kar diya gaya hai: {', '.join(updated_files)}")
    else:
        send_telegram_log("ℹ️ Kisi file mein badlav ki zaroorat nahi padi.")

if __name__ == "__main__":
    update_code_with_ai()
