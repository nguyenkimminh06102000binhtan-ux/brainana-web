import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const LOCALES_DIR = "public/locales";

const translations = {
  "en.json":               { c: ["Nailed it!", "You got it!", "Brilliant!", "That's right!", "Perfect!"],                                              w: ["Not quite — keep going!", "Almost there!", "Don't give up!", "You'll get it next time!", "Keep practicing!"] },
  "vietnamese.json":       { c: ["Chính xác!", "Xuất sắc!", "Tuyệt vời!", "Đúng rồi!", "Hoàn hảo!"],                                                  w: ["Chưa đúng — cố lên!", "Gần đúng rồi!", "Đừng bỏ cuộc!", "Lần sau sẽ được!", "Tiếp tục luyện tập!"] },
  "japanese.json":         { c: ["正解！", "すごい！", "完璧！", "その通り！", "よくできました！"],                                                       w: ["惜しい！続けよう！", "もう少し！", "諦めないで！", "次は絶対できる！", "練習あるのみ！"] },
  "korean.json":           { c: ["정답이에요!", "잘했어요!", "완벽해요!", "맞아요!", "훌륭해요!"],                                                        w: ["아쉬워요! 계속해요!", "거의 다 왔어요!", "포기하지 마요!", "다음엔 꼭 될 거예요!", "계속 연습해요!"] },
  "chinese-mandarin.json": { c: ["正确！", "太棒了！", "完美！", "就是这样！", "优秀！"],                                                               w: ["不太对，继续加油！", "差一点！", "别放弃！", "下次一定行！", "继续练习！"] },
  "chinese-cantonese.json":{ c: ["正確！", "叻仔！", "完美！", "係喇！", "優秀！"],                                                                     w: ["差少少，繼續！", "差唔多喇！", "唔好放棄！", "下次一定得！", "繼續練習！"] },
  "spanish.json":          { c: ["¡Correcto!", "¡Lo lograste!", "¡Brillante!", "¡Así es!", "¡Perfecto!"],                                              w: ["¡Casi! ¡Sigue adelante!", "¡Casi lo logras!", "¡No te rindas!", "¡La próxima vez!", "¡Sigue practicando!"] },
  "french.json":           { c: ["Exact !", "Tu l'as eu !", "Brillant !", "C'est ça !", "Parfait !"],                                                  w: ["Presque ! Continue !", "Presque !", "N'abandonne pas !", "La prochaine fois !", "Continue à pratiquer !"] },
  "german.json":           { c: ["Richtig!", "Geschafft!", "Brillant!", "Genau so!", "Perfekt!"],                                                      w: ["Fast! Weiter so!", "Fast geschafft!", "Nicht aufgeben!", "Nächstes Mal klappt's!", "Weiter üben!"] },
  "portuguese.json":       { c: ["Correto!", "Conseguiu!", "Brilhante!", "É isso mesmo!", "Perfeito!"],                                                w: ["Quase! Continue!", "Quase lá!", "Não desista!", "Na próxima vez!", "Continue praticando!"] },
  "arabic.json":           { c: ["صحيح!", "أحسنت!", "رائع!", "هذا صحيح!", "مثالي!"],                                                                  w: ["تقريباً — استمر!", "اقتربت!", "لا تستسلم!", "ستنجح المرة القادمة!", "واصل التدريب!"] },
  "russian.json":          { c: ["Верно!", "Отлично!", "Блестяще!", "Правильно!", "Идеально!"],                                                        w: ["Почти! Продолжай!", "Почти правильно!", "Не сдавайся!", "Следующий раз получится!", "Продолжай практиковать!"] },
  "indonesian.json":       { c: ["Benar!", "Kamu berhasil!", "Luar biasa!", "Tepat sekali!", "Sempurna!"],                                             w: ["Hampir benar!", "Hampir!", "Jangan menyerah!", "Lain kali pasti bisa!", "Terus berlatih!"] },
  "thai.json":             { c: ["ถูกต้อง!", "เก่งมาก!", "ยอดเยี่ยม!", "ใช่เลย!", "สมบูรณ์แบบ!"],                                                    w: ["เกือบแล้ว!", "เกือบถูกแล้ว!", "อย่าเพิ่งยอมแพ้!", "ครั้งหน้าจะทำได้!", "ฝึกต่อไปนะ!"] },
  "hindi.json":            { c: ["सही है!", "शाबाश!", "बहुत बढ़िया!", "एकदम सही!", "परफेक्ट!"],                                                       w: ["लगभग! जारी रखो!", "बस थोड़ा और!", "हार मत मानो!", "अगली बार होगा!", "अभ्यास जारी रखो!"] },
  "italian.json":          { c: ["Corretto!", "Ce l'hai fatta!", "Brillante!", "Esatto!", "Perfetto!"],                                                w: ["Quasi! Continua!", "Quasi ci sei!", "Non mollare!", "La prossima volta!", "Continua a praticare!"] },
  "dutch.json":            { c: ["Correct!", "Je hebt het!", "Briljant!", "Precies!", "Perfect!"],                                                     w: ["Bijna! Ga door!", "Bijna!", "Geef niet op!", "Volgende keer!", "Blijf oefenen!"] },
  "turkish.json":          { c: ["Doğru!", "Başardın!", "Harika!", "Aynen öyle!", "Mükemmel!"],                                                        w: ["Neredeyse! Devam et!", "Neredeyse!", "Pes etme!", "Bir dahaki sefere!", "Pratik yapmaya devam!"] },
  "polish.json":           { c: ["Poprawnie!", "Udało się!", "Świetnie!", "Dokładnie!", "Idealnie!"],                                                  w: ["Prawie! Dalej!", "Prawie!", "Nie poddawaj się!", "Następnym razem!", "Ćwicz dalej!"] },
  "malay.json":            { c: ["Betul!", "Berjaya!", "Hebat!", "Tepat sekali!", "Sempurna!"],                                                        w: ["Hampir betul!", "Hampir!", "Jangan berputus asa!", "Lain kali boleh!", "Teruskan berlatih!"] },
  "ukrainian.json":        { c: ["Вірно!", "Чудово!", "Блискуче!", "Правильно!", "Ідеально!"],                                                        w: ["Майже! Продовжуй!", "Майже!", "Не здавайся!", "Наступного разу!", "Продовжуй практикуватися!"] },
  "greek.json":            { c: ["Σωστό!", "Τα κατάφερες!", "Εξαιρετικό!", "Ακριβώς!", "Τέλειο!"],                                                   w: ["Σχεδόν! Συνέχισε!", "Σχεδόν!", "Μην τα παρατάς!", "Την επόμενη φορά!", "Συνέχισε να εξασκείσαι!"] },
  "swedish.json":          { c: ["Rätt!", "Du klarade det!", "Briljant!", "Precis!", "Perfekt!"],                                                      w: ["Nästan! Fortsätt!", "Nästan!", "Ge inte upp!", "Nästa gång!", "Fortsätt öva!"] },
  "norwegian.json":        { c: ["Riktig!", "Du klarte det!", "Brilliant!", "Nøyaktig!", "Perfekt!"],                                                 w: ["Nesten! Fortsett!", "Nesten!", "Ikke gi opp!", "Neste gang!", "Fortsett å øve!"] },
  "danish.json":           { c: ["Rigtigt!", "Du klarede det!", "Brilliant!", "Præcis!", "Perfekt!"],                                                  w: ["Næsten! Fortsæt!", "Næsten!", "Giv ikke op!", "Næste gang!", "Bliv ved med at øve!"] },
  "finnish.json":          { c: ["Oikein!", "Selvitit sen!", "Loistava!", "Täsmälleen!", "Täydellinen!"],                                              w: ["Melkein! Jatka!", "Melkein!", "Älä anna periksi!", "Ensi kerralla!", "Jatka harjoittelua!"] },
  "czech.json":            { c: ["Správně!", "Zvládl jsi to!", "Skvěle!", "Přesně tak!", "Perfektní!"],                                               w: ["Skoro! Pokračuj!", "Skoro!", "Nevzdávej se!", "Příště to vyjde!", "Pokračuj v procvičování!"] },
  "romanian.json":         { c: ["Corect!", "Ai reușit!", "Strălucit!", "Exact!", "Perfect!"],                                                        w: ["Aproape! Continuă!", "Aproape!", "Nu renunța!", "Data viitoare!", "Continuă să practici!"] },
  "hungarian.json":        { c: ["Helyes!", "Megcsináltad!", "Brilliáns!", "Pontosan!", "Tökéletes!"],                                                w: ["Majdnem! Folytasd!", "Majdnem!", "Ne add fel!", "Legközelebb sikerül!", "Gyakorolj tovább!"] },
};

const DEFAULT_EN = translations["en.json"];

const files = readdirSync(LOCALES_DIR).filter(f => f.endsWith(".json"));

let updated = 0;
for (const file of files) {
  const filePath = join(LOCALES_DIR, file);
  const data = JSON.parse(readFileSync(filePath, "utf8"));

  if (!data.study) continue;
  if (data.study.feedbackCorrect) continue; // already done

  const t = translations[file] ?? DEFAULT_EN;
  data.study.feedbackCorrect = t.c;
  data.study.feedbackWrong = t.w;

  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  updated++;
}

console.log(`Updated ${updated} locale files.`);
