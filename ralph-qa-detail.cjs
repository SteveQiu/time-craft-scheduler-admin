const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const https = require("https");

const secretPath = path.join(__dirname, ".secret");
const secret = {};
fs.readFileSync(secretPath, "utf8").split(/\r?\n/).forEach(line => {
  const eq = line.indexOf("=");
  if (eq > 0) secret[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
});

const email = secret["TESTER3_EMAIL"];
const password = secret["TESTER3_PASSWORD1"];
const SUPABASE_URL = "https://dbabjfydcllqbjpolhym.supabase.co";
const SUPABASE_ANON_KEY = secret["SUPABASE_Publishable_KEY"];
const PROJECT_REF = "dbabjfydcllqbjpolhym";

function supabaseSignIn(email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const url = new URL(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const session = await supabaseSignIn(email, password);
  if (session.error) { console.error("Auth failed:", session.error_description); process.exit(1); }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", err => errors.push("PAGE ERROR: " + err.message));

  // inject session
  await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: `sb-${PROJECT_REF}-auth-token`,
    value: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    }
  });

  await page.goto("http://localhost:8080/appointments", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  // Find flag-related elements
  const flagElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button, [data-testid], [aria-label], svg"));
    const flagRelated = all.filter(el => {
      const t = (el.textContent || "").toLowerCase();
      const a = (el.getAttribute("aria-label") || "").toLowerCase();
      const d = (el.getAttribute("data-testid") || "").toLowerCase();
      const title = (el.getAttribute("title") || "").toLowerCase();
      const cls = (el.className || "").toLowerCase();
      return t.includes("flag") || a.includes("flag") || d.includes("flag") || title.includes("flag") || cls.includes("flag");
    });
    return flagRelated.map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().substring(0, 50),
      ariaLabel: el.getAttribute("aria-label"),
      testId: el.getAttribute("data-testid"),
      title: el.getAttribute("title"),
      class: el.className?.substring(0, 80),
    }));
  });
  console.log("Flag elements found:", JSON.stringify(flagElements, null, 2));

  // Find Paid buttons
  const paidElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button, span, div, badge, [class*='badge']"));
    return all.filter(el => (el.textContent || "").toLowerCase().includes("paid"))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 80),
        class: el.className?.substring(0, 80),
      }));
  });
  console.log("Paid elements found:", JSON.stringify(paidElements, null, 2));

  // Find attend elements
  const attendElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    return all.filter(el => (el.textContent || "").toLowerCase().includes("attend") && el.childElementCount === 0)
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 100),
        class: el.className?.substring(0, 80),
      })).slice(0, 5);
  });
  console.log("Attend elements found:", JSON.stringify(attendElements, null, 2));

  if (errors.length) {
    console.log("Browser errors:", errors);
  } else {
    console.log("No browser errors.");
  }

  await browser.close();
})();
