// Еженедельный отчёт родителю на почту (Ками Плюс).
// Вызывает pg_cron раз в неделю с заголовком x-cron-secret; секрет сверяется
// с Vault через check_cron_secret(), поэтому снаружи функцию не запустить.
// Письма уходят через Resend. Нужны секреты функции:
//   RESEND_API_KEY — ключ Resend (вводится в панели Supabase, не в чате);
//   REPORT_FROM    — отправитель, например "Kami <report@ваш-домен>".
// Пока их нет, функция ничего не отправляет и отвечает {configured:false}.
import { createClient } from "jsr:@supabase/supabase-js@2";

type Word = { es: string; ru: string; en: string };
type Exam = { subject: string; date: string; score: number | null };
type Kid = {
  nickname: string; grade: string; lang: string; days: number; lessons: number;
  new_words: number; total_words: number; hard: Word[]; exams: Exam[];
};
type Row = { parent_id: string; email: string; students: Kid[] };

const SUBJECTS: Record<string, [string, string]> = {
  mat: ["Математика", "Maths"], bio: ["Биология", "Biology"], geo: ["География и история", "Geography & History"],
  len: ["Испанский язык", "Spanish language"], fyq: ["Физика и химия", "Physics & Chemistry"],
  val: ["Валенсийский", "Valencian"], ing: ["Английский", "English"], ef: ["Физкультура", "PE"],
  mus: ["Музыка", "Music"], tec: ["Технология", "Technology"], pla: ["ИЗО", "Art"], tut: ["Тьюторский час", "Tutoring"],
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function render(row: Row) {
  const ru = row.students.some((k) => k.lang === "ru" || k.lang === "uk");
  const T = ru
    ? {
      subject: "Неделя с Ками: как идут дела",
      hi: "Здравствуйте! Вот как прошла неделя в Ками.",
      days: "дней с занятиями", lessons: "уроков", newW: "новых слов", total: "слов всего",
      hard: "Слова, которые пока даются тяжело:", exams: "Контрольные:", noLessons: "На этой неделе занятий не было — может, напомните? Хватает 5 минут в день.",
      score: "лучший результат", none: "ещё не тренировался",
      foot: "Письмо приходит раз в неделю, пока подключён Ками Плюс. Отключить: Профиль → Для взрослых → «Отчёт на почту».",
    }
    : {
      subject: "Your week with Kami",
      hi: "Hello! Here is how the week went in Kami.",
      days: "days practised", lessons: "lessons", newW: "new words", total: "words in total",
      hard: "Words that are still tricky:", exams: "Tests:", noLessons: "No practice this week — maybe a gentle reminder? 5 minutes a day is enough.",
      score: "best result", none: "not practised yet",
      foot: "Sent weekly while Kami Plus is active. To turn off: Profile → For adults → “Email report”.",
    };
  const i = ru ? 0 : 1;
  const kids = row.students.map((k) => {
    const stat = (n: number, l: string) =>
      `<td style="padding:8px 10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#2E7D32">${n}</div><div style="font-size:12px;color:#666">${l}</div></td>`;
    const hard = k.hard.length
      ? `<p style="margin:14px 0 6px;font-weight:700">${T.hard}</p><ul style="margin:0;padding-left:18px">${
        k.hard.map((w) => `<li><b>${esc(w.es)}</b> — ${esc(ru ? w.ru : w.en)}</li>`).join("")
      }</ul>`
      : "";
    const exams = k.exams.length
      ? `<p style="margin:14px 0 6px;font-weight:700">${T.exams}</p><ul style="margin:0;padding-left:18px">${
        k.exams.map((e) =>
          `<li>${esc(SUBJECTS[e.subject]?.[i] ?? e.subject)}, ${esc(e.date.split("-").reverse().join("."))} — ${
            e.score == null ? T.none : `${T.score} ${e.score}%`
          }</li>`
        ).join("")
      }</ul>`
      : "";
    return `<div style="border:1px solid #e3eee3;border-radius:14px;padding:16px;margin:14px 0">
      <div style="font-size:18px;font-weight:800">${esc(k.nickname)} <span style="font-weight:400;color:#888;font-size:14px">${esc(k.grade)}</span></div>
      ${k.lessons === 0 ? `<p style="color:#B26A00">${T.noLessons}</p>` : ""}
      <table style="width:100%;margin-top:8px"><tr>${stat(k.days, T.days)}${stat(k.lessons, T.lessons)}${stat(k.new_words, T.newW)}${stat(k.total_words, T.total)}</tr></table>
      ${hard}${exams}
    </div>`;
  }).join("");
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;color:#222">
    <h2 style="color:#2E7D32;margin-bottom:4px">🦎 Kami</h2><p>${T.hi}</p>${kids}
    <p style="font-size:12px;color:#888;margin-top:20px">${T.foot}</p></div>`;
  return { subject: T.subject, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "method" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const secret = req.headers.get("x-cron-secret") ?? "";
  if (!secret) return reply({ error: "unauthorized" }, 401);
  const { data: ok } = await admin.rpc("check_cron_secret", { p_secret: secret });
  if (ok !== true) return reply({ error: "unauthorized" }, 401);

  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("REPORT_FROM");
  if (!key || !from) return reply({ configured: false });

  const { data, error } = await admin.rpc("weekly_report_batch");
  if (error) return reply({ error: "batch" }, 500);
  const rows = (data ?? []) as Row[];

  let sent = 0, failed = 0;
  for (const row of rows) {
    const { subject, html } = render(row);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [row.email], subject, html }),
    });
    if (r.ok) {
      sent++;
      await admin.rpc("mark_report_sent", { p_parent: row.parent_id });
    } else failed++;
    await new Promise((res) => setTimeout(res, 600)); // лимит Resend ~2 письма/сек
  }
  return reply({ configured: true, sent, failed });
});
