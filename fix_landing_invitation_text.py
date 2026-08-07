# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/App.jsx', encoding='utf-8') as f:
    content = f.read()

# Update invitationText initialization and add useEffect for lang changes
old_invitation = "  const [invitationText, setInvitationText] = useState('अपनी भाषा में बोलने के लिए माइक पर क्लिक करें (हिन्दी)');"

new_invitation = '''  const getInvitationTextForLang = (l) => {
    switch (l) {
      case 'english': return 'Tap the mic and speak in your mother tongue to auto-detect language';
      case 'hindi': return 'अपनी भाषा में बोलने के लिए माइक पर क्लिक करें (हिन्दी)';
      case 'telugu': return 'మాట్లాడటానికి మైక్‌ను నొక్కండి (తెలుగు)';
      case 'kannada': return 'ಮಾತನಾಡಲು ಮೈಕ್ ಒತ್ತಿ (ಕನ್ನಡ)';
      case 'bengali': return 'কথা বলতে মাইকে চাপ দিন (বাংলা)';
      case 'tamil': return 'பேச மைக் பட்டனை அழுத்தவும் (தமிழ்)';
      case 'marathi': return 'बोलण्यासाठी मायक्रोफोनवर क्लिक करा (मराठी)';
      case 'gujarati': return 'બોલવા માટે માઇક પર ક્લિક કરો (ગુજરાતી)';
      case 'punjabi': return 'ਬੋਲਣ ਲਈ ਮਾਈਕ \'ਤੇ ਕਲਿੱਕ ਕਰੋ (ਪੰਜਾਬੀ)';
      case 'malayalam': return 'സംസാരിക്കാൻ മൈക്കിൽ അമർത്തുക (മലയാളം)';
      case 'odia': return 'କହିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ (ଓଡ଼ିଆ)';
      case 'assamese': return 'ਕଥਾ ਕ\'বলৈ ਮাইকত টিপক (অসমীয়া)';
      default: return 'Tap the mic and speak in your mother tongue to auto-detect language';
    }
  };

  const [invitationText, setInvitationText] = useState(() => getInvitationTextForLang(lang));

  useEffect(() => {
    setInvitationText(getInvitationTextForLang(lang));
  }, [lang]);'''

if old_invitation in content:
    content = content.replace(old_invitation, new_invitation)
    print("✓ Updated invitationText to dynamically update on language change")

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating invitation text!")
