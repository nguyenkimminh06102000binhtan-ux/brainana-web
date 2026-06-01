import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../public/locales");

// Translations for ignoredLabel keyed by locale filename (without .json)
const TRANSLATIONS = {
  afrikaans: "Geïgnoreer",
  albanian: "Injoruar",
  amharic: "ተዉ",
  arabic: "مُتجاهَل",
  armenian: "Անտեսված",
  azerbaijani: "Nəzərə alınmayan",
  basque: "Ezikusiarena",
  belarusian: "Ігнараваны",
  bengali: "উপেক্ষিত",
  bosnian: "Ignorisano",
  bulgarian: "Игнориран",
  catalan: "Ignorat",
  "chinese-cantonese": "已忽略",
  "chinese-mandarin": "已忽略",
  croatian: "Ignorirano",
  czech: "Ignorováno",
  danish: "Ignoreret",
  dutch: "Genegeerd",
  estonian: "Ignoreeritud",
  "filipino-tagalog": "Binabalewala",
  finnish: "Ohitettu",
  french: "Ignoré",
  galician: "Ignorado",
  georgian: "იგნორირებული",
  german: "Ignoriert",
  greek: "Αγνοημένο",
  gujarati: "અવગણ્યું",
  hausa: "An yi watsi",
  hebrew: "מוּתְעלָם",
  hindi: "अनदेखा",
  hungarian: "Figyelmen kívül hagyva",
  icelandic: "Hunsað",
  indonesian: "Diabaikan",
  irish: "Neamhaird",
  italian: "Ignorato",
  japanese: "無視済み",
  javanese: "Diabaikan",
  kannada: "ನಿರ್ಲಕ್ಷಿಸಲಾಗಿದೆ",
  kazakh: "Еленбеген",
  khmer: "មិនអើពើ",
  korean: "무시됨",
  kurdish: "Guh nedihat",
  lao: "ຖືກລະເລີຍ",
  latvian: "Ignorēts",
  lithuanian: "Ignoruota",
  macedonian: "Игнориран",
  malay: "Diabaikan",
  malayalam: "അവഗണിച്ചത്",
  maltese: "Injorat",
  maori: "Kāore i aro",
  marathi: "दुर्लक्षित",
  mongolian: "Үл тоомсорлосон",
  nepali: "बेवास्ता",
  norwegian: "Ignorert",
  other: "Ignored",
  pashto: "له پامه غورزول شوی",
  persian: "نادیده گرفته شده",
  polish: "Ignorowane",
  portuguese: "Ignorado",
  punjabi: "ਨਜ਼ਰਅੰਦਾਜ਼",
  romanian: "Ignorat",
  russian: "Игнорируемое",
  serbian: "Игнорисано",
  sinhala: "නොසලකා හැරීම",
  slovak: "Ignorované",
  slovenian: "Prezrto",
  somali: "La iska indho tiray",
  spanish: "Ignorado",
  swahili: "Kupuuzwa",
  swedish: "Ignorerad",
  tajik: "Нодида гирифта шудааст",
  tamil: "புறக்கணிக்கப்பட்டது",
  telugu: "విస్మరించబడింది",
  thai: "ถูกละเว้น",
  turkish: "Yoksayıldı",
  ukrainian: "Ігнорується",
  urdu: "نظرانداز",
  uzbek: "E'tiborga olinmagan",
  vietnamese: "Bị bỏ qua",
  welsh: "Wedi'i anwybyddu",
  yoruba: "Ti fojufo",
  zulu: "Okulahlwe",
};

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const filePath = path.join(localesDir, file);
  const locale = file.replace(".json", "");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!data.learn) continue;
  if (data.learn.ignoredLabel) continue; // already present

  const translation = TRANSLATIONS[locale] ?? "Ignored";
  data.learn.ignoredLabel = translation;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`Updated ${file}: "${translation}"`);
}

console.log("Done.");
