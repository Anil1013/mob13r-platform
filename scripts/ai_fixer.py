import google.generativeai as genai
import os, glob

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

def fix_code():
    files = glob.glob("backend/**/*.js", recursive=True) + glob.glob("frontend/src/**/*.js", recursive=True)
    for path in files:
        with open(path, 'r') as f:
            code = f.read()
        response = model.generate_content(f"Fix syntax errors in this code and return ONLY the code:\n\n{code}")
        fixed_code = response.text.replace("```javascript", "").replace("```", "").strip()
        with open(path, 'w') as f:
            f.write(fixed_code)

if __name__ == "__main__":
    fix_code()
