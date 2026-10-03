/* ===================== CLASS OF 2026 — SETTINGS (edit only this file) =====================
   Every value is plain text. Multi-line values: one item per line, fields separated by |
   Icons: use a 3D icon name from assets/icons (without .png), e.g. graduation_cap, stethoscope, hot_beverage,
   or type any normal emoji. Full guide: README.md */
window.SITE = {
  name: "طب الأزهر دمياط",
  logo: "assets/logo.png",                              // e.g. assets/logo.png  (empty = "YOUR LOGO" placeholder)
  frame: "assets/frame.png",             // square (1:1) PNG with a transparent middle — visitors upload a photo that sits behind it
  frameOpens: "2026-12-18T00:00:00",     // Frame tool stays locked with a "coming soon" overlay until this date/time. Leave "" to unlock it right away.
  date: "2026-12-19T13:00:00",           // graduation date & time
  since: "2021-10-10",                   // "days since" counter
  music: "assets/audio/music.mp3",       // put your mp3 here (plays with the intro)
  gradsound: "assets/audio/grad.mp3",                         // graduation-day sound, e.g. assets/audio/grad.mp3
  milestones: ``,                        // countdown sounds, one per line: 50=assets/audio/50days.mp3
  backend: "https://script.google.com/macros/s/AKfycby1x1xxg39KiDB7gZWzYDqVMT_cY8jb1U7MwOFOzJkrc7SL_LukkMr0unOUcJhNepb1Xg/exec",                           // Google Apps Script Web app URL (see README.md)

  intro: `SENIORS 2026
5 years. 10 semesters. One dream.
A thousand memories.
THE LAST CHAPTER BEGINS`,

  ticker: `graduation_cap | SENIORS 2026
hot_beverage | COFFEE: ∞
stethoscope | OSCE SURVIVORS
books | JUST ONE MORE CHAPTER
sleeping_face | SLEEP IS OPTIONAL
brain | WHAT WAS THAT MNEMONIC AGAIN?
party_popper | WE MADE IT`,

years: `books | YEAR 1 | Where It All Began | Basic sciences, endless lectures, and our first steps into the world of medicine.
dna | YEAR 2 | Going Deeper | Cardio, respiratory, and the moment medicine started feeling a little more real.
microscope | YEAR 3 | First Steps in the Hospital | Our first hospital days, first patients, first white coats, and the feeling of finally becoming doctors.
hospital | YEAR 4 | Into the Real World | Internal medicine, surgery, long rounds, and lessons that went far beyond the lecture hall.
graduation_cap | YEAR 5 | The Final Chapter | The final exams, the endless rotations, mandatory OB/GYN days, countless memories… and somehow, we made it here.` ,

  stats: `hot_beverage | Cups of coffee | ∞
sleeping_face | Hours of sleep we never got | ∞
brain | Facts memorized, then forgotten | ∞
stethoscope | Promises of "just one more chapter" | ∞`,

  social: `instagram=https://www.instagram.com/aud_med_2026/
facebook=https://www.facebook.com/profile.php?id=61583995127897
X=https://x.com/AudMed2026
telegram=`,

  events: `coat | Senior Jacket Day | SOON | HALL | Pick up your jacket and take the group photo.
party_popper | Graduation Ceremony | 2026-12-19 13:00 | College | The chapter is complete. Arrive by 12:00.`,

  announce: `Senior Jacket Day is coming! | SOON | | 2026-09-01 | 2026-10-12`,

  polls: `خد من الكلية ايه؟ | مدمن كافيين | اقرعيت من الصلع الوراثي | بتسف بنادول | ارق ومعرفش انام  
كام مره طبقت ف الامتحانات؟ | ولا مرة | مرتين او تلاتة | كتير | يعني ايه نوم  
دمياط هتوحشك | لا | no | Nein  | ممكن `,

  cats: `FIRST DAY, SENIOR JACKET, OSCE, LECTURES, HOSPITAL, SENIORS CHILD, FRIENDS, FUNNY MOMENTS, GRADUATION`,

  /* exam roadmap: icon | Subject name | YYYY-MM-DD  — each gets an automatic ✓ once its exam
     day passes 2:00 PM. Icons here are the flat/grainy set in assets/icons (heart_pulse,
     family_group, book_open, scalpel, anesthesia_mask, bone_joint). */
  exams: `heart_pulse | Internal Medicine | 2026-10-24
family_group | Family Medicine | 2026-11-07
book_open | Elective | 2026-11-21
scalpel | Surgery | 2026-11-28
anesthesia_mask | Anesthesia | 2026-12-05
bone_joint | Orthopedics | 2026-12-19`,

  /* your own photos for the board: file | title | CATEGORY | date   (put files in assets/photos/) */
  photos: ``
  /* example:  assets/photos/01.jpg | Day one | FIRST DAY | 2021-10-10 */
};
