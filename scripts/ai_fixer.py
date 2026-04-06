import google.generativeai as genai
import os, glob, requests

# Setup
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

def get_last_instruction():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    res = requests.get(url).json()
    if res['result']:
        # Sabse aakhri message uthana
        return res['result'][-1]['message']['text']
    return None

def update_code():
    instruction = get_last_instruction()
    # Agar message '/start' ya koi command nahi hai, tabhi badlav karega
    if not instruction or instruction.startswith('/'):
        return

    # JS files scan karna (node_modules ignore rahega .gitignore ki wajah se)
    files = glob.glob("backend/**/*.js", recursive=True) + glob.glob("frontend/src/**/*.js", recursive=True)
    
    for path in files:
        with open(path, 'r') as f:
            old_code = f.read()

        prompt = f"User Instruction: {instruction}\nFile: {path}\nCode:\n{old_code}\n\nUpdate this code as per user instruction. Return ONLY the code, no markdown."
        
        try:
            response = model.generate_content(prompt)
            new_code = response.text.replace("```javascript", "").replace("```", "").strip()
            if new_code != old_code:
                with open(path, 'w') as f: f.write(new_code)
        except:
            pass

if __name__ == "__main__":
    update_code()
