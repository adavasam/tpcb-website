# TPCB Website Admin Guide

This guide covers the five most common update tasks for the TPCB website. All steps use the GitHub web interface — no terminal commands required.

---

## 1. Adding a News Post

News posts live in the `_news/` folder. Each post is a plain text file with a `.md` extension.

**Steps:**

1. Go to the repository on GitHub.
2. Click on the `_news/` folder.
3. Click **Add file → Create new file**.
4. Name the file using the format: `YYYY-MM-DD-short-title.md`
   - Example: `2026-05-15-student-wins-award.md`
5. Paste this template at the top of the file:

```
---
layout: post
date: 2026-05-15
title: "Student wins national award"
tags: [awards, students]
---

Write the news post body here. One to two paragraphs is typical.
```

6. Replace the date, title, tags, and body with real content.
7. **Available tags:** `awards`, `students`, `faculty`, `publications`, `events`
8. Scroll down and click **Commit changes**.

The post will appear on the News page and the homepage feed automatically.

---

## 2. Updating the Application Deadline

The application deadline is stored in one place: `_data/program.yml`. Changing it here updates every page that displays it.

**Steps:**

1. Go to the repository on GitHub.
2. Click on the `_data/` folder, then open `program.yml`.
3. Click the **pencil icon** (Edit this file).
4. Find the line:
   ```
   application_deadline: "December 1, 2025"
   ```
5. Change the date to the new deadline.
6. Also update `application_url` if the application portal URL has changed.
7. Click **Commit changes**.

The new deadline will appear on the homepage, the Prospective Students page, and the Contact page.

---

## 3. Adding a Faculty Member

Faculty profiles live in the `_faculty/` folder. Each file generates a profile page and a card in the faculty directory.

**Step A — Add the profile file:**

1. Go to the `_faculty/` folder in GitHub.
2. Click **Add file → Create new file**.
3. Name the file: `lastname-firstname.md` (all lowercase, hyphenated)
   - Example: `smith-jane.md`
4. Paste this template:

```
---
layout: profile
name: Jane A. Smith, PhD
institution: WCM
department: Biochemistry
website: https://smithlab.org
profile:
  image: logos/headshot-placeholder.png
research_areas:
  - RNA Biology
  - Chemical Genetics
  - Drug Discovery
---

Write a 2–3 sentence description of the lab's research here.
```

5. Set `institution` to exactly one of: `WCM`, `Rockefeller`, or `MSK`.
6. Click **Commit changes**.

**Step B — Upload a headshot (optional):**

1. Go to `assets/img/` in the repository.
2. Create a subfolder called `faculty/` if it doesn't exist (or navigate into it).
3. Click **Add file → Upload files** and upload a square headshot image.
   - Name it: `lastname-firstname.jpg` (e.g., `smith-jane.jpg`)
4. In the faculty profile file you created in Step A, change:
   ```
   image: logos/headshot-placeholder.png
   ```
   to:
   ```
   image: faculty/smith-jane.jpg
   ```
5. Commit the change.

---

## 4. Adding a Student Profile

Student profiles live in the `_students/` folder and work the same way as faculty profiles.

**Steps:**

1. Go to the `_students/` folder in GitHub.
2. Click **Add file → Create new file**.
3. Name the file: `lastname-firstname.md`
4. Paste this template:

```
---
layout: profile
name: Jordan Lee
year: 2
institution: MSK
lab: Smith Lab
advisor: Jane A. Smith, PhD
profile:
  image: logos/headshot-placeholder.png
research_areas:
  - RNA Biology
  - Chemical Probes
---

Write 2–3 sentences about the student's background and research.
```

5. Set `year` to the student's current program year (1–6).
6. Set `institution` to `WCM`, `Rockefeller`, or `MSK`.
7. Click **Commit changes**.

The student will appear on the Students page automatically.

---

## 5. Adding a Publication

Publications are stored in `_bibliography/papers.bib` as BibTeX entries. This is the source of truth for the Publications page.

**Steps:**

1. Go to `_bibliography/papers.bib` in GitHub.
2. Click the **pencil icon** (Edit this file).
3. Scroll to the bottom of the file.
4. Add a new BibTeX entry. Here is the format for a journal article:

```bibtex
@article{AuthorYear,
  author    = {Smith, Jane A. and Jones, Robert B.},
  title     = {Title of the paper here},
  journal   = {Journal of the American Chemical Society},
  year      = {2026},
  volume    = {148},
  number    = {3},
  pages     = {1234--1245},
  doi       = {10.1021/jacs.6b01234}
}
```

5. Replace `AuthorYear` with a unique key (e.g., `Smith2026`).
6. Fill in the author, title, journal, year, volume, pages, and DOI fields.
7. Click **Commit changes**.

The publication will appear on the Publications page grouped by year.

**Tips:**
- The DOI is optional but recommended — it creates a clickable link.
- You can get BibTeX for any paper from Google Scholar (click Cite → BibTeX).
- The `@article` type is for journal articles. Use `@book` for books, `@inproceedings` for conference papers.
