# Spotify Extended Quota Mode · application draft

Apply at: https://developer.spotify.com/dashboard → tu app **Wrapd** → **Settings** → **Quota**
→ button **Request Extension**.

Spotify shows a form with several fields. Pega los siguientes textos según
encajen. Suelen pedir variantes de esto cada cierto tiempo, ajústalo si la UI
ha cambiado.

---

## Field: **What does your app do?** / **Describe your app**

> **Wrapd** is a personal-portfolio web app that lets a Spotify listener
> connect their account and explore their own listening data in a single
> mobile-first dashboard.
>
> Once a user authorises with their Spotify account, Wrapd reads their
> currently-playing track, recent plays and top tracks/artists, persists them
> in a private database, and renders:
>
> - A live "now playing" widget with track progress.
> - Top artists and tracks by period (last 4 weeks, 6 months, all-time).
> - Personal audio profile (energy, valence, danceability, tempo) computed
>   from `audio-features`.
> - A genre overview computed from the artist objects.
> - A heatmap of listening hours by day of the week.
> - A downloadable share card (1080×1920, 1080×1080, 1200×630) generated
>   server-side and intended to be shared on Instagram / X / LinkedIn.
>
> It is **non-commercial, ad-free and open-source**. The repository is public
> at https://github.com/Antoniojesus122/wrapd.

---

## Field: **Why are you requesting extended quota?**

> The current 25 daily-active-user quota is enough for development on my own
> account, but I want to share Wrapd with friends, classmates and a small
> group of recruiters reviewing my portfolio (well under 100 users).
>
> I also use the deprecated endpoints `audio-features`, `audio-analysis`,
> the full artist objects from `/artists`, and `recommendations`. These are
> central to the value proposition of Wrapd (mood-of-the-month, energy of
> your music, genre evolution). Extended Quota Mode would re-enable them.

---

## Field: **Expected number of users**

> 10 – 50 users. Wrapd is a personal portfolio piece, not a commercial
> product. Users are friends, classmates, and recruiters viewing my work.

---

## Field: **Will you monetise the app?**

> No. Wrapd is and will remain free, ad-free and non-commercial. The source
> code is public (MIT license).

---

## Field: **Website / app URL**

> https://wrapd.app  (production)
> http://127.0.0.1:3000  (local development)

---

## Field: **Privacy Policy URL**

> https://wrapd.app/privacy

---

## Field: **Terms of Service URL**

> https://wrapd.app/terms

---

## Field: **Contact email**

> antoniojesusgonzalezdomingo4@gmail.com

---

## Field: **Anything else?**

> The app is built with Next.js 16 + TypeScript on the frontend and a Python
> worker (Prefect + SQLAlchemy + psycopg) on the backend. Tokens are stored
> encrypted-at-rest in PostgreSQL (Supabase EU) and accessed only by the
> server-side worker. We are happy to provide a walkthrough or live demo if
> needed.

---

## Optional but helps: attach screenshots

Spotify a veces deja adjuntar screenshots. Si te lo permite, sube:

1. **Login screen** (wrapd.app landing)
2. **Home dashboard** con KPIs + now playing
3. **Top artists** (Spotify Top, 4w/6m/all-time)
4. **Stats** (audio profile + heatmap)
5. **Share card** descargable

Las que ya tienes capturadas en `~/Desktop/portfolio-ideas/...` valen perfectamente,
o sacas nuevas de tu instancia local en `http://127.0.0.1:3000`.

---

## Tips de envío

- **Tono honesto**: nada de oversell. Spotify lee miles de éstos al mes y
  aprueba más rápido los que se ven serios y no comerciales.
- **Tener Privacy / Terms accesibles desde la landing** — Spotify revisa
  los enlaces literalmente. Ya están en el footer de `/`.
- **App pública en producción**: Spotify quiere ver que la URL responde
  y que se puede iniciar el login. Por eso desplegamos a Vercel antes.
- **Tiempo de respuesta**: 1-2 semanas habitual. A veces piden info extra
  por email; respóndela ese mismo día y suele acelerar.
