import google.generativeai as genai
import os
import glob
import requests

# Secrets & Configuration
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def send_telegram(message):
    """Telegram par bold aur clear updates bhejne ke liye"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def get_user_instruction():
    """Telegram se aapki latest instruction uthana"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    try:
        res = requests.get(url).json()
        if res.get('result'):
            for item in reversed(res['result']):
                if 'message' in item and 'text' in item['message']:
                    msg = item['message']['text']
                    if msg.lower() not in ['/start', 'fix', 'deploy']:
                        return msg
    except: return None
    return None

def process_robo_logic():
    instruction = get_user_instruction()
    if not instruction: return

    # Poori Repository ki files scan karna (Backend + Frontend)
    all_files = glob.glob("backend/**/*.js", recursive=True) + \
                glob.glob("frontend/src/**/*.js", recursive=True) + \
                glob.glob("frontend/src/**/*.jsx", recursive=True) + \
                glob.glob("*.json", recursive=False)

    file_structure = "\n".join([f"- {f}" for f in all_files[:20]]) # Top 20 files for context

    # AI ko Brain banana
    brain_prompt = (
        f"User Instruction: {instruction}\n"
        f"Project Structure:\n{file_structure}\n\n"
        "Role: You are a Full-Stack AI Engineer. \n"
        "1. Analyze if the user is asking a QUESTION or a CODE CHANGE.\n"
        "2. If QUESTION: Explain the logic, list the files involved, and suggest improvements in Hindi/English mix.\n"
        "3. If CODE CHANGE: Identify the exact files, find the bug, and provide updated code using the [FILE:path] updated code [/FILE] format.\n"
        "4. Be conversational, witty, and smart like Gemini."
    )

    ai_response = model.generate_content(brain_prompt).text

    # Agar sirf baatein karni hain (Analysis/Question)
    if "[FILE:" not in ai_response:
        send_telegram(ai_response)
        return

    # Agar code update karna hai
    send_telegram("🔍 Mujhe kuch issues mile hain, unhe theek kar raha hoon...")
    
    import re
    # [FILE:path]...[/FILE] pattern ko dhoondna
    updates = re.findall(r'\[FILE:(.*?)\](.*?)\[/FILE\]', ai_response, re.DOTALL)
    
    updated_count = 0
    for path, new_code in updates:
        path = path.strip()
        clean_code = new_code.strip().replace("```javascript", "").replace("```jsx", "").replace("```", "").strip()
        
        if os.path.exists(path):
            with open(path, 'w') as f:
                f.write(clean_code)
            updated_count += 1
            send_telegram(f"✅ `{path}` ko update kar diya gaya hai.")

    if updated_count > 0:
        send_telegram(f"🚀 Total {updated_count} files update ho gayi hain. Ab deployment shuru ho raha hai!")

if __name__ == "__main__":
    process_robo_logic()
