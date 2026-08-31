# FUEL 42 Participant Onboarding Process

## Operating goal

FUEL 42 is a paid **42-day** program that runs from **September 14 through October 25, 2026**. Each paid participant receives Fuel Different app access through **October 31, 2026**, without being charged the normal recurring $25 subscription during that period.

The process intentionally keeps FUEL 42 access separate from recurring subscription status. This prevents FUEL 42 purchases from being counted as monthly subscribers in billing reports and makes access end cleanly after the program.

## Participant journey

| Stage | Participant experience | Internal result |
|---|---|---|
| 1. Purchase | Selects a FUEL 42 package and pays through the correct Stripe Payment Link. | Stripe records a paid checkout session. |
| 2. Registration follow-up | Receives an email asking them to reserve an initial InBody consultation for September 13, 14, or 15. | The FUEL 42 roster displays the paid participant as **Purchased**. |
| 3. Initial consultation | Meets with Kelly for the InBody scan, package review, and FUEL 42 orientation. | Kelly opens the FUEL 42 roster and selects **Send App Setup**. |
| 4. Secure app setup | Receives a one-time setup email. New users create an account; existing users sign in. | The paid challenge pass is claimed, giving access through October 31 and bypassing the $25 payment page. |
| 5. Personalized onboarding | Completes profile, goals, training preferences, and uploads the initial InBody result. | Fuel Different generates nutrition recommendations. |
| 6. Coaching assignment | Completes onboarding. | The participant is assigned to Kelly and receives a welcome message in app chat. The roster changes to **Onboarding Complete**. |

## Kelly’s consultation checklist

At each initial consultation, confirm the participant’s identity and their selected package. Complete the InBody scan first, then open **Admin Dashboard → FUEL 42** and find the participant in the roster.

Select **Send App Setup** only after the consultation is complete. The system sends a secure, one-time setup link using the email address used at Stripe checkout. The participant can complete setup beside you or later from their own phone. Do not direct FUEL 42 participants to the ordinary public sign-up page because it leads to the recurring monthly checkout.

The participant’s access remains active through 11:59:59 p.m. Central Time on October 31, 2026. On November 1, the normal payment-required flow applies unless they begin a recurring subscription or an administrator grants another valid program pass.

## Roster statuses

| Status | Meaning | Staff action |
|---|---|---|
| **Purchased** | Stripe payment is complete; no app setup has been sent. | Confirm consultation, then select **Send App Setup**. |
| **Setup Sent** | Secure setup email was sent. | Follow up if not claimed before the program begins. |
| **Claimed** | Participant created or signed into the app and activated access. | Encourage completion of app onboarding. |
| **Onboarding Complete** | InBody/setup flow is complete and Kelly is assigned in the app. | Monitor through the normal coach/admin views. |

## Email automation and Gymnetics booking link

The Gymnetics consultation link is connected to the Stripe purchase email and the FUEL 42 confirmation page:

```text
https://link.gymntx.com/widget/bookings/fuel42-challenge
```

The email subject is **“You’re registered for FUEL 42 — book your InBody consultation.”** It confirms the package, directs the purchaser to reserve September 13–15, and explains that app setup occurs during the consultation. The optional `FUEL42_BOOKING_URL` environment variable may be set in Vercel later if the booking destination changes.

## Required setup before accepting FUEL 42 purchases

1. Run `FUEL42-SETUP.sql` in the Fuel Different Supabase SQL Editor.
2. Deploy the Fuel Different app code containing the FUEL 42 routes and webhook handling.
3. Confirm the existing Stripe webhook endpoint includes `checkout.session.completed` events and points to the production Fuel Different webhook URL.
4. If the booking link changes, set `FUEL42_BOOKING_URL` in Vercel and redeploy. Without that optional variable, the current approved Gymnetics link is used.
5. Test with one $0 test-mode purchase or a temporary live payment/refund before widely promoting the challenge.

## Important boundaries

The FUEL 42 pass does **not** modify `profiles.subscription_status`. Participants are not misclassified as recurring subscribers, and their challenge access does not inflate monthly recurring revenue. The existing monthly athlete plan continues to function unchanged for regular app members.
