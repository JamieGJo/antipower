# How to publish the map online

The workflow file at `.github/workflows/pages.yml` is already set up.
Every time you push changes to GitHub, the site rebuilds and goes live automatically.

---

## First time only (do these steps once)

### Step 1 — Create a new GitHub repository

1. Go to **github.com** and sign in
2. Click the **+** button (top right) → **New repository**
3. Name it something like `thom-activity-map`
4. Leave everything else as default → click **Create repository**

### Step 2 — Open the website folder in GitHub Desktop

1. Open **GitHub Desktop**
2. Go to **File → Add Local Repository**
3. Navigate to this folder (`activity data/website/`) and click **Add Repository**
4. If it says "This directory does not appear to be a Git repository" — click **create a repository**

### Step 3 — Make your first commit and push

1. In GitHub Desktop you'll see all the files listed on the left
2. In the **Summary** box at the bottom left, type: `Initial commit`
3. Click **Commit to main**
4. Click **Publish repository** (blue button, top right)
   - Make sure your GitHub account is selected
   - Uncheck "Keep this code private" if you want the site to be public
   - Click **Publish repository**

### Step 4 — Enable GitHub Pages

1. Go to your new repo on github.com (GitHub Desktop has a button: **View on GitHub**)
2. Click **Settings** (top tab) → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Click **Save**

### Step 5 — Wait ~2 minutes

Go to the **Actions** tab in your repo. You'll see a yellow dot (running) → green tick (done).

Your site is now live at:
```
https://YOUR-GITHUB-USERNAME.github.io/thom-activity-map/
```

---

## Updating the site later

Each time you change files:

1. In GitHub Desktop: write a short commit message → **Commit to main** → **Push origin**
2. GitHub rebuilds and redeploys automatically (takes about 2 minutes)
3. Check the **Actions** tab to confirm it succeeded

### If the data files changed (new xlsx)

Run this in Terminal first, then commit and push as above:

```bash
cd "activity data/website"
python3 scripts/build_data.py
```

---

## Finding your live URL

```
https://YOUR-GITHUB-USERNAME.github.io/thom-activity-map/
```

Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username (visible at the top right of github.com when signed in).
