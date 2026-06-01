import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../public/locales");

const TRANSLATIONS = {
  afrikaans: "Stel kaarte in",
  albanian: "Konfiguro kartat",
  amharic: "ካርዶችን አዋቅር",
  arabic: "تكوين البطاقات",
  armenian: "Կարգավորել քարտերը",
  azerbaijani: "Kartları konfiqurasiya et",
  basque: "Konfiguratu txartelak",
  belarusian: "Наладзіць карткі",
  bengali: "কার্ড কনফিগার করুন",
  bosnian: "Konfiguriši kartice",
  bulgarian: "Конфигурирайте картите",
  catalan: "Configura les targes",
  "chinese-cantonese": "配置卡片",
  "chinese-mandarin": "配置卡片",
  croatian: "Konfigurirajte kartice",
  czech: "Konfigurovat karty",
  danish: "Konfigurer kort",
  dutch: "Kaarten instellen",
  estonian: "Seadista kaarte",
  "filipino-tagalog": "I-configure ang mga card",
  finnish: "Määritä kortit",
  french: "Configurer les cartes",
  galician: "Configurar tarxetas",
  georgian: "ბარათების კონფიგურაცია",
  german: "Karten konfigurieren",
  greek: "Ρύθμιση καρτών",
  gujarati: "કાર્ડ ગોઠવો",
  hausa: "Tsara katunan",
  hebrew: "הגדר כרטיסים",
  hindi: "कार्ड कॉन्फ़िगर करें",
  hungarian: "Kártyák konfigurálása",
  icelandic: "Stilla spjöld",
  indonesian: "Konfigurasikan kartu",
  irish: "Cumraigh cártaí",
  italian: "Configura le schede",
  japanese: "カードを設定",
  javanese: "Atur kartu",
  kannada: "ಕಾರ್ಡ್‌ಗಳನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಿ",
  kazakh: "Карталарды баптау",
  khmer: "រៀបចំប័ណ្ណ",
  korean: "카드 설정",
  kurdish: "Kartên mîheng bike",
  lao: "ຕັ້ງຄ່າບັດ",
  latvian: "Konfigurēt kartes",
  lithuanian: "Konfigūruoti korteles",
  macedonian: "Конфигурирај картички",
  malay: "Konfigurasikan kad",
  malayalam: "കാർഡുകൾ ക്രമീകരിക്കുക",
  maltese: "Ikkonfigura l-karti",
  maori: "Tautuhia ngā kāri",
  marathi: "कार्ड कॉन्फिगर करा",
  mongolian: "Карт тохируулах",
  nepali: "कार्डहरू कन्फिगर गर्नुहोस्",
  norwegian: "Konfigurer kort",
  other: "Configure cards",
  pashto: "کارتونه تنظیم کړئ",
  persian: "پیکربندی کارت‌ها",
  polish: "Konfiguruj karty",
  portuguese: "Configurar cartões",
  punjabi: "ਕਾਰਡ ਕੌਂਫਿਗਰ ਕਰੋ",
  romanian: "Configurați cardurile",
  russian: "Настроить карточки",
  serbian: "Konfiguriši kartice",
  sinhala: "කාඩ්පත් වින්‍යාස කරන්න",
  slovak: "Konfigurovať karty",
  slovenian: "Konfigurirajte kartice",
  somali: "Habbee kaadhadhka",
  spanish: "Configurar tarjetas",
  swahili: "Sanidi kadi",
  swedish: "Konfigurera kort",
  tajik: "Корточаҳоро танзим кунед",
  tamil: "கார்டுகளை உள்ளமைக்கவும்",
  telugu: "కార్డులు కాన్ఫిగర్ చేయండి",
  thai: "ตั้งค่าการ์ด",
  turkish: "Kartları yapılandır",
  ukrainian: "Налаштувати картки",
  urdu: "کارڈز ترتیب دیں",
  uzbek: "Kartalarni sozlash",
  vietnamese: "Cấu hình thẻ",
  welsh: "Ffurfweddu cardiau",
  yoruba: "Ṣeto awọn kaadi",
  zulu: "Misa amakhadi",
};

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "en.json");

for (const file of files) {
  const filePath = path.join(localesDir, file);
  const locale = file.replace(".json", "");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!data.course?.configureWords) continue;
  data.course.configureWords = TRANSLATIONS[locale] ?? "Configure cards";
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

console.log("Done.");
