import google.generativeai as genai
import os
import glob
import requests
import traceback

# Configuration
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def send_telegram(message):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": f"🤖 *Mob13r-Robo:* \n\n{message}", "parse_mode": "Markdown"}
    requests.post(url, json=payload)

def get_user_instruction():
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    try:
        res = requests.get(url).json()
        if res.get('result'):
            for item in reversed(res['result']):
                if 'message' in item and 'text' in item['message']:
                    return item['message']['text']
    except: return None
    return None

def process_robo_logic():
    try:
        instruction = get_user_instruction()
        if not instruction:
            send_telegram("⚠️ Mujhe aapki instruction nahi mili. Kya aapne kuch likha tha?")
            return

        # Scanning for ALL files to be sure
        all_files = glob.glob("**/*.js", recursive=True) + \
                    glob.glob("**/*.jsx", recursive=True) + \
                    glob.glob("package.json", recursive=True)

        if not all_files:
            send_telegram("⚠️ Mujhe repository mein koi JS ya JSX file nahi mili. Folder structure check karein.")
            return

        file_list_text = "\n".join([f"- {f}" for f in all_files[:15]])

        # Robo Thinking
        prompt = (
            f"User Question: {instruction}\n"
            f"Files Found: {file_list_text}\n\n"
            "Explain in Hindi-English mix what files are present and answer the user query detail."
        )

        response = model.generate_content(prompt)
        
        if response.text:
            send_telegram(response.text)
        else:
            send_telegram("⚠️ Gemini ne koi jawab nahi diya. Check API settings.")

    except Exception as e:
        error_msg = traceback.format_exc()
        send_telegram(f"❌ *Script Error:* \n`{str(e)}`")
        print(error_msg)

if __name__ == "__main__":
    process_robo_logic()
