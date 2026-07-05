# ליאב שמעונוב · שף פרטי — Landing Page

אתר נחיתה סטטי. HTML + CSS + JS + תמונות. אין build step, אין תלויות בענן.

---

## איך להעלות ל-GitHub Pages — צעד־אחר־צעד

**חשוב:** לא לגרור את התיקייה `liav_chef_landing` עצמה ל-GitHub — צריך להעלות את **התוכן שבתוכה**.

### דרך 1 — דרך אתר GitHub (הכי פשוט)

1. פתח repo חדש ב-GitHub: [github.com/new](https://github.com/new)
   - שם: משהו קצר באנגלית (למשל `liav-chef`)
   - Public
   - **בלי** README, `.gitignore`, license — נשלח את כל אלה מהתיקייה
2. במסך שנפתח לחץ **uploading an existing file** (או `Add file → Upload files`).
3. פתח את `C:\Users\orian\liav_chef_landing` ב-File Explorer.
4. **סמן הכל בפנים** (Ctrl+A) — כולל התיקיות `assets` וקבצים מוסתרים כמו `.nojekyll`.
   - אם קבצים מוסתרים לא מוצגים: `View → Show → Hidden items`.
5. גרור את הבחירה לחלון GitHub. שם ה-repo חייב להישאר **ריק** — הקבצים חייבים להיות ב-root.
6. `Commit changes`. חכה שיסתיים להעלות.
7. `Settings → Pages → Source: Deploy from a branch → main / (root) → Save`.
8. חכה 30–60 שניות. הכתובת תופיע למעלה: `https://<שם-משתמש>.github.io/<שם-repo>/`

### דרך 2 — דרך שורת פקודה (Git)

```bash
cd "C:\Users\orian\liav_chef_landing"
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

אחר כך: `Settings → Pages → Deploy from a branch → main`.

---

## מבנה הפרויקט

```
liav_chef_landing/
├── index.html                # העמוד הראשי
├── privacy.html              # מדיניות פרטיות
├── terms.html                # תנאי שימוש
├── accessibility.html        # הצהרת נגישות
├── .nojekyll                 # אומר ל-GitHub Pages לא להריץ Jekyll (חשוב!)
├── .gitignore
├── .gitattributes            # מנרמל line endings — מונע קבצים מקולקלים
├── README.md
└── assets/
    ├── styles.css            # מערכת עיצוב מלאה
    ├── app.js                # אנימציות וגלילה
    ├── real/                 # 10 תמונות אמיתיות מהאינסטגרם של ליאב
    └── vendor/               # GSAP + ScrollTrigger + Lenis (self-hosted, שומר CSP)
```

---

## אם משהו נשבר אחרי העלאה

בדוק בסדר הזה:

1. **URL תקין?** צריך להיות `https://<user>.github.io/<repo>/` — סלאש בסוף. בלי סלאש GitHub לפעמים מפנה לא נכון.
2. **Pages הופעל?** Settings → Pages — צריך להיות סטטוס ירוק "Your site is live at..."
3. **קבצים בבסיס?** ב-Repo view, אתה אמור לראות את `index.html` בשורה הראשונה. אם רואים `liav_chef_landing/` — העלית תיקייה במקום תוכן. מחק ותעלה שוב.
4. **תיקיית `assets/` שם?** לחץ עליה — צריך לראות בפנים `styles.css`, `app.js`, וכו'.
5. **בדפדפן: F12 → Console** — אם יש 404 אדומים, הם יגידו איזה קובץ חסר.
6. **בדפדפן: F12 → Network** — Refresh. אם `styles.css` או `app.js` מקבלים 404, יש בעיה בהעלאה.

---

## אבטחה

- **CSP קפדני** מוגדר ב-`<meta>` של כל דף — `default-src 'self'`.
- **אין inline handlers**, אין `eval()`, אין ספריות מ-CDN חיצוני.
- כל התלויות (GSAP, Lenis) מקומיות תחת `assets/vendor/`.
- טפסים? אין — כל הפניות עוברות דרך `wa.me/` או `tel:`.
- ווידג'ט נגישות תוצרת בית — לא סקריפט צד ג'.

---

© 2026 ליאב שמעונוב · כל הזכויות שמורות.
