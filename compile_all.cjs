const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'package.json',
  'vite.config.js',
  'vercel.json',
  'eslint.config.js',
  '.env.example',
  'src/main.jsx',
  'src/index.css',
  'src/App.css',
  'src/App.jsx',
  'src/sw.js',
  'src/components/ErrorBoundary.jsx',
  'src/components/Dashboard.jsx',
  'src/components/InitialAssessment.jsx',
  'src/components/LandingHero.jsx',
  'src/components/Register.jsx',
  'src/components/VoicePractice.jsx',
  'src/components/assessment.jsx',
  'src/components/Premium.jsx',
  'src/components/CourseFlow.jsx',
  'src/components/SplashScreen.jsx',
  'src/components/PWAInstallPrompt.jsx',
  'src/components/PushNotificationManager.jsx',
  'src/services/auth.js',
  'src/services/db.js',
  'src/services/supabase.js',
  'src/config/languages.js',
  'src/data/contentMatrix.js',
  'src/data/coursesData.js',
  'src/data/lessonQuizzes.js',
  'backend/app.py'
];

let output = `# Sakshar AI Platform — Complete Source Code\n*Last updated: ${new Date().toISOString().split('T')[0]}*\n\n---\n\n`;

for (const relPath of files) {
  const fullPath = path.join(__dirname, relPath);
  if (fs.existsSync(fullPath)) {
    const ext = path.extname(relPath).replace('.', '');
    const lang = ext === 'jsx' || ext === 'js' ? 'javascript' : ext === 'json' ? 'json' : ext === 'py' ? 'python' : ext === 'html' ? 'html' : ext === 'css' ? 'css' : '';
    const content = fs.readFileSync(fullPath, 'utf8');
    output += `## 📄 ${relPath}\n\`\`\`${lang}\n${content}\n\`\`\`\n\n---\n\n`;
  } else {
    console.warn(`File not found: ${relPath}`);
  }
}

fs.writeFileSync(path.join(__dirname, 'FULL_PROJECT_CODE.md'), output, 'utf8');
console.log('Successfully generated FULL_PROJECT_CODE.md!');
