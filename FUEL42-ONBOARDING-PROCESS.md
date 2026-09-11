# FUEL 42 In-Person Onboarding Process

**Owner:** Kelly Green, Iron Flag Fitness

**Program:** FUEL 42 — 42-Day Challenge

**Challenge dates:** September 14–October 25, 2026

**Temporary Fuel Different access:** Through October 31, 2026

## Purpose

This process is for clients who have already purchased FUEL 42 through Stripe, including both new Fuel Different users and clients who already have accounts. The participant does not need to exist in the app before the InBody appointment. Their Stripe purchase creates a private FUEL 42 enrollment, and the secure setup link connects that enrollment to the correct new or existing account.

> The participant must use the same email address used at Stripe checkout. The secure setup link verifies the purchase and prevents the participant from being sent to the normal $25-per-month subscription checkout.

## Staff Workflow

| Stage | Staff action | Participant experience | System result |
|---|---|---|---|
| 1. Confirm purchase | Open **Admin → FUEL 42** and locate the participant in the roster. | No app account is required yet. | The roster shows the Stripe purchaser as **Purchased / Paid — Awaiting Setup**. |
| 2. Complete consultation | Perform the initial InBody scan and discuss the participant’s challenge goals. | The participant receives their initial body-composition information privately. | The scan is ready to be uploaded during app intake. |
| 3. Send setup | Select **Send App Setup** in the FUEL 42 roster. | The participant receives a secure account-setup link by email. | The enrollment moves to **Setup Sent**, and Kelly is assigned as the FUEL 42 coach. |
| 4. Create or access account | Help the participant open the secure link on their phone. | A new participant creates an account; an existing Fuel Different user signs in. They use the same email used at purchase. | The setup token links the paid enrollment to the authenticated profile and grants temporary challenge access. |
| 5. Complete regular intake | Stay with the participant while they enter personal details, body stats, goals, and training information. Upload or photograph the initial InBody printout on the **Body Stats** step. | The normal intake automatically displays **FUEL 42 Purchase Verified** and follows the challenge-specific path. No payment screen appears. | An athlete profile and initial scan record are created, the enrollment is marked **Onboarding Complete**, and the participant is assigned to Kelly. |
| 6. Complete private challenge intake | Continue to the private FUEL 42 goals page and review the verified scan values with the participant. | The participant sees private starting weight, body-fat percentage, and skeletal-muscle mass. Goal body-fat percentage appears first, followed by optional goal body weight and the October 25 target date. The participant can defer the body-fat goal to the coach or choose no scale-weight goal. | Private challenge inputs are saved and personalized nutrition targets are refreshed from the InBody starting point, goals, training context, and guarded challenge strategy. |
| 7. Confirm dashboard | Open the participant dashboard before the appointment ends. | The participant sees their Fuel Different dashboard and FUEL 42 progress/leaderboard card. | The participant can begin check-ins, meal logging, activity tracking, and private weekly weigh-ins. |

## Important Setup Rules

The secure setup email is the starting point for a purchaser who does not yet have an app account. Do not direct a paid FUEL 42 participant through the ordinary public signup path, because ordinary signup prepares the recurring $25-per-month checkout.

The special setup-link parameters are used only to claim the purchased enrollment. Once claimed, regular onboarding verifies the private enrollment server-side and automatically recognizes FUEL 42. Refreshing the page or returning through the normal onboarding address will not remove the challenge track.

The setup link is unique to one purchase and should not be forwarded to another person. The claim step checks that the authenticated account email matches the Stripe purchase email.

## What the Participant Sees

During regular intake, a verified participant sees a green **FUEL 42 Purchase Verified** notice explaining that challenge access is included and no additional payment is required. Challenge participants are automatically treated as General Fitness members for the base profile so they receive the appropriate activity-level and multiple-choice training-style questions without sport/team questions.

After base intake, the participant continues to the private FUEL 42 intake. The verified InBody starting point is shown separately from the participant’s goals so current values are not confused with desired outcomes. Goal body-fat percentage is presented first because final challenge body-composition scoring uses the verified beginning and final scans. Goal weight remains available because it helps guide protein and calorie calculations, but a participant may choose not to set a scale-weight goal.

Goal weight, goal body-fat percentage, InBody values, treatment context, and body-composition changes remain private. Other participants see only the chosen leaderboard display name, rank, and engagement points. Self-entered goals never award leaderboard points; final body-composition points use staff-verified scan changes only.

## Existing Fuel Different Users

If the purchaser already has a Fuel Different account, use the **Already have an account? Sign in here** link in the setup email. After sign-in, the same secure claim occurs. The app then routes the participant to whichever step remains: regular onboarding, FUEL 42 private intake, or the dashboard.

## Nutrition Target Guardrails

FUEL 42 uses the latest InBody scan as the private starting point. Body-recomposition goals use a moderate 250–300 calorie adjustment. Focused-fat-loss goals use a 400–500 calorie adjustment, limited to no more than 20% below estimated maintenance. If a requested timeline would require a larger deficit, the app uses the safer cap rather than matching the aggressive deadline.

Protein is based primarily on goal weight, with an InBody fat-free-mass cross-check. This prevents a participant with higher starting body fat from receiving an excessive protein target based on current total weight. Body-recomposition protein generally falls within 0.9–1.0 grams per pound of goal or adjusted weight; focused fat loss and frequent resistance training can move the target toward 1.0–1.1 grams per pound.

Fat targets approximately 30% of calories for body recomposition and 25–30% for focused fat loss. The automatic calculation will not go below 20% of calories and also applies a practical goal-weight-based gram safeguard. Carbohydrates receive the remaining calories. For demanding training such as CrossFit, HYROX, strength, mixed conditioning, or endurance work, the app reduces the deficit before allowing carbohydrates to fall below the configured training-fuel range.

Medication, peptide, or related treatment disclosure remains private coaching context and does not automatically lower calories or alter macros.

## Troubleshooting

| Situation | Staff response |
|---|---|
| The participant sees the $25 payment page | Return to the FUEL 42 roster and resend the secure app-setup email. Confirm they opened that link and used the Stripe purchase email. |
| The app says the account is not linked to an active FUEL 42 purchase | Confirm the email entered in Fuel Different exactly matches the Stripe purchase email. Do not bypass payment manually; resend the correct secure setup link. |
| The link says it has already been used | Have the participant sign in with the account that originally claimed it. If the wrong account claimed the link, review the enrollment before changing any data. |
| The participant completed base intake but not private challenge intake | On the next sign-in, the app routes the verified participant to the remaining FUEL 42 intake before the dashboard. |
| The challenge intake or leaderboard will not load | Confirm `FUEL42-CHALLENGE-SETUP.sql` has been run in Supabase and the current app deployment is healthy. |
| The InBody photo cannot be read | Enter weight and other available values manually, finish intake, and add or review the scan from the participant record afterward. |

## Final InBody Scan and Body-Composition Points

At the end of the challenge, complete the participant’s final InBody scan. In the FUEL 42 roster, select **Verify Final Scan** for the participant, or open `/admin/fuel42/scans?athlete=<athlete-id>`. Choose the correct starting and final scans, then verify them.

Body-composition points are calculated only when the participant granted body-composition scoring consent and staff verified both scan selections. Raw weight, body-fat percentage, skeletal-muscle mass, and calculated changes are never shown on the public leaderboard.

## Platforms and Responsibilities

| Platform or system | Function in this workflow |
|---|---|
| Stripe | Collects the FUEL 42 package purchase and supplies the purchaser’s checkout identity. |
| Fuel Different on Vercel | Hosts the authenticated app, regular intake, private challenge intake, participant dashboard, and staff challenge tools. |
| Supabase Authentication | Creates and authenticates the participant account. |
| Supabase Database and Storage | Stores enrollment status, athlete profile, private challenge preferences, InBody scan records/images, consent, and server-calculated challenge data. |
| Resend | Sends the secure FUEL 42 app-setup email from the admin roster. |
| Gymnetics / GoHighLevel | Handles the separate purchase-confirmation, booking, tag, email, and SMS automation configured for the campaign. |
| GitHub | Maintains the application source and deployment history. |

## Implementation References

The authenticated enrollment check is implemented in `app/api/challenges/fuel42/status/route.ts`. Secure purchase claiming is handled by `app/api/challenges/fuel42/claim/route.ts`. Regular onboarding is implemented in `app/athlete/onboarding/page.tsx`, and the follow-on private intake is implemented in `app/athlete/challenge/intake/page.tsx`. Staff enrollment actions are available in `app/admin/fuel42/page.tsx`, while final scan verification is available in `app/admin/fuel42/scans/page.tsx`.
