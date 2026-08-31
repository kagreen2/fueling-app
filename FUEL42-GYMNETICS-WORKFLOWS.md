# FUEL 42 Gymnetics Workflows

The authenticated Gymnetics workspace is **Iron Flag Fitness – Westmont, Westmont, IL**. It is hosted in the Big Little Gyms Gymnetics/GoHighLevel account and includes the Automation → Workflows workspace.

## Workflow A: FUEL 42 Purchase → Booking and Enrollment

**Name:** `FUEL 42 — Purchase Confirmation & Consultation Booking`

**Entry trigger:** A secure inbound webhook received from the Fuel Different Stripe webhook after a successful FUEL 42 package checkout. The app validates Stripe's signed event and restricts the handoff to the four FUEL 42 Payment Link IDs, so ordinary Iron Flag and Fuel Different purchases do not enter the workflow. This accepts both paid checkouts and the one approved fully discounted `FUELFREE2` test checkout.

| Order | Workflow action |
|---:|---|
| 1 | Add tag: `FUEL 42 — Registered` |
| 2 | Send internal notification to Kelly and Coach Abby with purchaser name, email, mobile number, and purchased package. |
| 3 | Send email: **You’re registered for FUEL 42 — book your InBody consultation.** |
| 4 | Include booking CTA: `https://link.gymntx.com/widget/bookings/fuel42-challenge` |
| 5 | Optional: create an opportunity in a FUEL 42 onboarding pipeline, if an appropriate pipeline already exists. |

The email should explain that the buyer should choose an InBody scan and app-setup appointment on September 13, 14, or 15 and that the program runs through October 25. It should not promise app credentials until the in-person consultation.

### App bridge configuration

When this inbound workflow is saved, Gymnetics generates a unique inbound webhook URL. Add that value as the following **Vercel production environment variable** for the Fuel Different app, then redeploy the app:

```text
FUEL42_GYMNETICS_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/...
```

The Fuel Different app posts the purchaser's email, name, phone, package name/key, amount, Stripe checkout-session ID, and the approved booking URL. Until this setting is provided, the app safely uses the existing direct Fuel Different confirmation email as a fallback.

## Workflow B: Weekly Office Hours Reminder

**Name:** `FUEL 42 — Monday Office Hours SMS Reminder`

**Entry trigger:** Contact tag added: `FUEL 42 — Registered`.

| Setting | Value |
|---|---|
| Audience | Contacts with the `FUEL 42 — Registered` tag only |
| Schedule | Mondays at 1:15 p.m. Central Time |
| Active program dates | September 14 through October 26, 2026 |
| Channel | SMS text message |
| Exit condition | Tag removed, workflow manually stopped, or challenge end date reached |

The Zoom link is still needed before the reminder can be activated. Recommended copy: **“FUEL 42 office hours start today at 1:15 p.m. CT. Bring your nutrition, training, or habit questions and join here: [Zoom link]”**

## Activation standard

Both workflows should remain in **Draft** until Kelly confirms the final email sender, the internal notification recipients, and the weekly Zoom meeting URL. A one-time zero-dollar checkout using the `FUELFREE2` code should be used to verify the Stripe trigger, tag, email, and internal notification before either workflow is published.
