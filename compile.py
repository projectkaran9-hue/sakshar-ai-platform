import os

files = [
    r"c:\Users\HP\Desktop\sakshar-ai-platform\index.html",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\package.json",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\vite.config.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\vercel.json",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\eslint.config.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\.env.example",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\main.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\index.css",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\App.css",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\App.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\sw.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\ErrorBoundary.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\Dashboard.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\InitialAssessment.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\LandingHero.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\Register.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\VoicePractice.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\assessment.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\Premium.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\CourseFlow.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\SplashScreen.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\PWAInstallPrompt.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\components\PushNotificationManager.jsx",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\services\auth.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\services\db.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\services\supabase.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\config\languages.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\data\contentMatrix.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\data\coursesData.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\src\data\lessonQuizzes.js",
    r"c:\Users\HP\Desktop\sakshar-ai-platform\backend\app.py"
]

out_path = r"C:\Users\HP\Desktop\sakshar-ai-platform\FULL_PROJECT_CODE.md"

with open(out_path, "w", encoding="utf-8") as out:
    for file_path in files:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            ext = os.path.splitext(file_path)[1].replace(".", "")
            if ext == "js" or ext == "jsx":
                ext = "javascript"
            elif ext == "py":
                ext = "python"
                
            out.write(f"### `{file_path}`\n\n```{ext}\n{content}\n```\n\n")
        else:
            out.write(f"### `{file_path}`\n\nFile not found.\n\n")

print("Done compiling files.")
