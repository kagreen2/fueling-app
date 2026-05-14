/**
 * Menstrual Cycle Tracker Utility
 * 
 * Provides cycle phase calculation, macro adjustment factors, and display helpers.
 * 
 * Phases (based on a typical 28-day cycle, adjusted for user's actual cycle length):
 * 1. Menstrual (Days 1-5): Period — moderate metabolism, focus on iron-rich foods
 * 2. Follicular (Days 6-13): Rising estrogen — higher carb tolerance, peak performance
 * 3. Ovulatory (Days 14-16): Peak estrogen — highest energy, best training window
 * 4. Luteal (Days 17-28): Rising progesterone — BMR +100-300 cal, increased fat oxidation
 * 
 * References:
 * - Dr. Stacy Sims: ROAR, Next Level — female physiology and performance
 * - Dr. Katie Schofield: Low Energy Availability in female athletes
 * - Webb (1986): BMR variation across menstrual cycle
 * - Bisdee et al. (1989): Energy expenditure and menstrual cycle
 * - Oosthuyse & Bosch (2010): Effect of menstrual cycle on exercise metabolism
 * - McNulty et al. (2020): Menstrual cycle and exercise performance meta-analysis
 */

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown'

export interface CyclePhaseInfo {
  phase: CyclePhase
  dayOfCycle: number
  daysUntilNextPeriod: number
  label: string
  emoji: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  nutritionTip: string
  recoveryTip: string
  supplementTip: string
  trainingInsight: string
}

// Arrays of tips per phase — rotated daily so users see fresh content
const MENSTRUAL_NUTRITION_TIPS = [
  'Iron stores drop during menstruation. Prioritize heme iron sources (red meat, organ meats) which absorb 2-3x better than plant iron. Pair plant sources with vitamin C.',
  'Anti-inflammatory foods are key right now. Omega-3 rich salmon, sardines, walnuts, and turmeric help reduce prostaglandin-driven cramping and inflammation.',
  'Magnesium-rich foods (dark chocolate, pumpkin seeds, spinach) can reduce cramp severity by 30-40%. Your body loses magnesium during menstruation.',
  'This is NOT the time to restrict calories. Under-fueling during your period increases cortisol, worsens cramps, and extends recovery. Eat to your hunger.',
  'Warm, easily digestible meals support your body now. Bone broth, soups, and stews provide collagen, minerals, and hydration without taxing digestion.',
]

const MENSTRUAL_RECOVERY_TIPS = [
  'Your inflammatory markers are naturally elevated. Gentle movement (walking, yoga, light swimming) promotes blood flow and reduces cramping without adding stress.',
  'Sleep is your #1 recovery tool this phase. Progesterone has dropped, which can disrupt sleep. Magnesium glycinate (300-400mg) before bed supports both sleep and cramp relief.',
  'Heat therapy is especially effective now. A warm bath or heating pad increases blood flow to the uterus and reduces prostaglandin-driven pain naturally.',
  'This is a natural deload period. Dr. Sims recommends reducing training volume by 20-30% during days 1-3, then gradually building back as energy returns.',
  'Hydration needs increase due to blood loss. Add electrolytes (sodium, potassium, magnesium) to your water — plain water alone won\'t fully rehydrate.',
]

const MENSTRUAL_SUPPLEMENT_TIPS = [
  'Iron + Vitamin C together: Take iron with orange juice or a vitamin C source to boost absorption by up to 6x. Avoid taking with coffee or calcium.',
  'Omega-3s (2-3g EPA/DHA) act as natural anti-inflammatories and can reduce period pain as effectively as ibuprofen in some studies.',
  'Magnesium glycinate (300-400mg) at bedtime helps with cramps, sleep, and mood. It\'s the most bioavailable form and won\'t cause GI issues.',
  'Creatine supports your brain and muscles even during low-energy days. Maintain your 3-5g daily dose — don\'t skip it because you feel low energy.',
  'Ginger (1g/day) has been shown to reduce menstrual pain intensity comparable to NSAIDs. Try fresh ginger tea or a supplement.',
]

const FOLLICULAR_NUTRITION_TIPS = [
  'Rising estrogen makes your muscles more insulin-sensitive. This is your best carb-tolerance window — fuel hard sessions with quality carbs before and after training.',
  'Your body stores glycogen more efficiently now. Front-load carbs around training: oats, rice, sweet potatoes, and fruit will fuel high-intensity work.',
  'Protein synthesis is ramping up with estrogen. Hit 30-40g protein per meal to maximize muscle protein synthesis during this anabolic window.',
  'Estrogen is rising, which supports gut health and nutrient absorption. This is a great time to introduce new foods or increase fiber intake.',
  'Your appetite may naturally decrease as estrogen rises (it\'s an appetite suppressant). Don\'t under-eat — match fuel to your training demands, not just hunger.',
]

const FOLLICULAR_RECOVERY_TIPS = [
  'Your body recovers faster now thanks to estrogen\'s anti-inflammatory effects. You can handle higher training volume and shorter rest between sessions.',
  'This is your PR window. Estrogen supports tendon and ligament repair, making this the safest time for heavy lifting and plyometrics.',
  'Cold exposure (cold showers, ice baths) is most effective in this phase. Estrogen enhances the anti-inflammatory response to cold therapy.',
  'Your pain tolerance is higher in the follicular phase. Push training intensity — your body can handle more stress and will adapt better.',
  'Sleep quality tends to be best in this phase (estrogen supports deep sleep). Use this advantage to train harder knowing recovery is optimized.',
]

const FOLLICULAR_SUPPLEMENT_TIPS = [
  'Creatine (3-5g daily) pairs perfectly with this high-performance phase. It enhances power output and supports the ATP-PC system for explosive movements.',
  'B-vitamins support the increased energy metabolism happening now. A B-complex helps convert the extra carbs you\'re eating into usable energy.',
  'Caffeine is more effective in the follicular phase — you need less for the same performance boost. Consider reducing your dose slightly.',
  'Vitamin D3 + K2 support the bone-building that estrogen promotes. This phase is when your bones are most responsive to loading and nutrients.',
  'Collagen (10-15g) before training supports the connective tissue adaptation that\'s enhanced by rising estrogen levels.',
]

const OVULATORY_NUTRITION_TIPS = [
  'Peak estrogen means peak performance — but also peak injury risk. Fuel with adequate protein (1.6-2.2g/kg) to support connective tissue integrity.',
  'Your metabolic rate is starting to shift. Maintain high-quality nutrition but be aware that appetite may fluctuate as hormones peak and then drop.',
  'Antioxidant-rich foods (berries, dark leafy greens, beets) support the high training output your body can handle right now.',
  'Hydration is critical — estrogen affects fluid regulation. Drink to thirst plus an extra 500ml on training days. Add sodium if you\'re a heavy sweater.',
  'This is the best time for nutrient-dense, performance-focused eating. Your body is primed to use everything you give it for muscle and strength gains.',
]

const OVULATORY_RECOVERY_TIPS = [
  'Ligament laxity peaks at ovulation due to high estrogen. Focus on stability work, proper warm-ups, and controlled movements to prevent ACL/joint injuries.',
  'Your nervous system is firing optimally. This is ideal for skill work, complex movements, and sport-specific training that requires coordination.',
  'Recovery between sets can be shorter — your cardiovascular system is most efficient now. Use this for density training or supersets.',
  'Be mindful of overreaching. You FEEL amazing, but injury risk is elevated. Maintain form over load, especially in single-leg and rotational movements.',
  'Active recovery (light movement, mobility work) between intense sessions helps maintain the high output without accumulating excessive fatigue.',
]

const OVULATORY_SUPPLEMENT_TIPS = [
  'Maintain creatine (3-5g) — your ATP demands are highest during this peak performance window. It directly supports the explosive work you\'re capable of.',
  'Tart cherry juice or extract (500mg) supports recovery from the higher training loads you can handle now. It reduces muscle soreness and inflammation.',
  'Electrolytes are essential — sodium, potassium, magnesium. Your sweat rate may increase and fluid shifts are happening with hormonal changes.',
  'Whey protein (25-40g) within 30 min post-training maximizes the elevated muscle protein synthesis happening at peak estrogen.',
  'Curcumin (500mg with black pepper) supports joint health during this high-output phase when connective tissue is under more stress.',
]

const LUTEAL_NUTRITION_TIPS = [
  'Your BMR is 100-300 calories higher. Cravings are your body\'s signal that it needs more fuel — honor them with nutrient-dense choices, not restriction.',
  'Shift toward more fats and protein, fewer simple carbs. Your body is oxidizing more fat for fuel now and has reduced carb tolerance (Dr. Sims, ROAR).',
  'Serotonin drops in the luteal phase, driving carb cravings. Complex carbs (oats, quinoa, sweet potato) boost serotonin without the blood sugar crash.',
  'Protein needs increase to preserve lean mass as progesterone is catabolic. Aim for the higher end of your protein range (2.0-2.4g/kg if in a deficit).',
  'Salt cravings are real and physiological — progesterone is a natural diuretic. Don\'t restrict sodium; add electrolytes to prevent dehydration and headaches.',
]

const LUTEAL_RECOVERY_TIPS = [
  'Your core temperature is 0.3-0.5°C higher, making you fatigue faster and feel hotter during exercise. Pre-cool with cold water and train in cooler environments.',
  'Perceived exertion is higher — the same workout feels harder. This is NOT weakness, it\'s physiology. Reduce intensity by 5-10% and maintain volume.',
  'Prioritize sleep above all else. Progesterone\'s sleep-disrupting effects compound with elevated cortisol. Magnesium + tart cherry before bed helps.',
  'Sauna use (15-20 min, 80-100°C) in the luteal phase supports heat shock proteins, reduces inflammation, and improves cardiovascular resilience (Dr. Sims).',
  'This is NOT the time for PR attempts or max testing. Focus on moderate-intensity strength work, technique refinement, and aerobic base building.',
]

const LUTEAL_SUPPLEMENT_TIPS = [
  'Creatine is MORE useful in the luteal phase. Estrogen drops reduce your natural creatine synthesis — supplementing 3-5g daily compensates for this loss.',
  'Magnesium glycinate (400mg) is essential now. It supports sleep, reduces anxiety, eases water retention, and helps with the mood changes progesterone causes.',
  'Ashwagandha (300-600mg) helps modulate the cortisol spike that occurs in the late luteal phase. It supports mood, sleep, and stress resilience.',
  'Omega-3s (2-3g EPA/DHA) combat the increased inflammation of the luteal phase and support brain function when estrogen\'s neuroprotective effects decline.',
  'Calcium (500mg) + Vitamin D in the luteal phase has been shown to reduce PMS symptoms by up to 50% in clinical trials.',
]

/**
 * Calculate the current cycle phase based on last period start date and cycle length
 */
export function getCyclePhase(
  lastPeriodStart: string | Date,
  cycleLength: number = 28
): CyclePhaseInfo {
  const start = new Date(lastPeriodStart)
  const today = new Date()
  
  // Reset time components for accurate day calculation
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const diffMs = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // Calculate current day in cycle (1-indexed, wraps around)
  const dayOfCycle = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1
  const daysUntilNextPeriod = cycleLength - dayOfCycle + 1
  
  // Use day of cycle to rotate through tips so users see fresh content daily
  const tipIndex = (dayOfCycle - 1) % 5
  
  // Phase boundaries scaled to cycle length
  const menstrualEnd = Math.round(cycleLength * 5 / 28)        // ~5 days
  const follicularEnd = Math.round(cycleLength * 13 / 28)      // ~13 days
  const ovulatoryEnd = Math.round(cycleLength * 16 / 28)       // ~16 days
  // Luteal: ovulatoryEnd+1 through cycleLength
  
  let phase: CyclePhase
  let label: string
  let emoji: string
  let color: string
  let bgColor: string
  let borderColor: string
  let description: string
  let nutritionTip: string
  let recoveryTip: string
  let supplementTip: string
  let trainingInsight: string
  
  if (dayOfCycle <= menstrualEnd) {
    phase = 'menstrual'
    label = 'Menstrual'
    emoji = '🔴'
    color = 'text-red-400'
    bgColor = 'bg-red-500/10'
    borderColor = 'border-red-500/30'
    description = 'Period phase — energy may be lower, focus on nourishment and recovery'
    nutritionTip = MENSTRUAL_NUTRITION_TIPS[tipIndex]
    recoveryTip = MENSTRUAL_RECOVERY_TIPS[tipIndex]
    supplementTip = MENSTRUAL_SUPPLEMENT_TIPS[tipIndex]
    trainingInsight = 'Reduce volume 20-30% days 1-3. Gentle movement helps cramps. Build back as energy returns.'
  } else if (dayOfCycle <= follicularEnd) {
    phase = 'follicular'
    label = 'Follicular'
    emoji = '🟢'
    color = 'text-green-400'
    bgColor = 'bg-green-500/10'
    borderColor = 'border-green-500/30'
    description = 'Rising energy — your body is primed for high-intensity training and PRs'
    nutritionTip = FOLLICULAR_NUTRITION_TIPS[tipIndex]
    recoveryTip = FOLLICULAR_RECOVERY_TIPS[tipIndex]
    supplementTip = FOLLICULAR_SUPPLEMENT_TIPS[tipIndex]
    trainingInsight = 'Push intensity. Your body recovers faster, tolerates more volume, and adapts better to heavy loads.'
  } else if (dayOfCycle <= ovulatoryEnd) {
    phase = 'ovulatory'
    label = 'Ovulatory'
    emoji = '⚡'
    color = 'text-yellow-400'
    bgColor = 'bg-yellow-500/10'
    borderColor = 'border-yellow-500/30'
    description = 'Peak performance window — but watch for increased injury risk from ligament laxity'
    nutritionTip = OVULATORY_NUTRITION_TIPS[tipIndex]
    recoveryTip = OVULATORY_RECOVERY_TIPS[tipIndex]
    supplementTip = OVULATORY_SUPPLEMENT_TIPS[tipIndex]
    trainingInsight = 'Peak power and coordination. Focus on form — ligament laxity is highest. Great for skill work and strength.'
  } else {
    phase = 'luteal'
    label = 'Luteal'
    emoji = '🟣'
    color = 'text-purple-400'
    bgColor = 'bg-purple-500/10'
    borderColor = 'border-purple-500/30'
    description = 'Metabolism rises — cravings are biological, not weakness. Your body needs more fuel.'
    nutritionTip = LUTEAL_NUTRITION_TIPS[tipIndex]
    recoveryTip = LUTEAL_RECOVERY_TIPS[tipIndex]
    supplementTip = LUTEAL_SUPPLEMENT_TIPS[tipIndex]
    trainingInsight = 'Reduce intensity 5-10%, maintain volume. Focus on steady-state and technique. Not the time for maxing out.'
  }
  
  return {
    phase,
    dayOfCycle,
    daysUntilNextPeriod,
    label,
    emoji,
    color,
    bgColor,
    borderColor,
    description,
    nutritionTip,
    recoveryTip,
    supplementTip,
    trainingInsight,
  }
}

/**
 * Get macro adjustment factors based on cycle phase
 * Returns multipliers to apply to base macro calculations
 * 
 * Based on:
 * - Dr. Stacy Sims: ROAR — substrate utilization across the cycle
 * - Webb (1986): Luteal BMR increase of ~100-300 kcal
 * - Oosthuyse & Bosch (2010): Substrate utilization shifts across cycle
 */
export function getCycleMacroAdjustments(phase: CyclePhase): {
  calorieAdjustment: number  // Additional calories (not a multiplier)
  carbMultiplier: number     // Multiplier for carb g/kg target
  fatMultiplier: number      // Multiplier for fat allocation
  proteinMultiplier: number  // Multiplier for protein g/kg target
  note: string
} {
  switch (phase) {
    case 'menstrual':
      return {
        calorieAdjustment: 0,
        carbMultiplier: 1.0,
        fatMultiplier: 1.0,
        proteinMultiplier: 1.0,
        note: 'Menstrual phase: standard macros, prioritize iron-rich foods and anti-inflammatory nutrition',
      }
    case 'follicular':
      return {
        calorieAdjustment: 0,
        carbMultiplier: 1.05,   // Slightly higher carb tolerance
        fatMultiplier: 0.95,
        proteinMultiplier: 1.0,
        note: 'Follicular phase: higher carb tolerance, efficient glycogen storage — fuel your training',
      }
    case 'ovulatory':
      return {
        calorieAdjustment: 50,
        carbMultiplier: 1.05,
        fatMultiplier: 1.0,
        proteinMultiplier: 1.05,  // Higher protein synthesis
        note: 'Ovulatory phase: peak performance, elevated protein synthesis — support connective tissue',
      }
    case 'luteal':
      return {
        calorieAdjustment: 150,   // BMR increase (conservative mid-range of 100-300)
        carbMultiplier: 0.92,     // Reduced carb tolerance
        fatMultiplier: 1.15,      // Increased fat oxidation
        proteinMultiplier: 1.05,  // Slightly higher protein needs (progesterone is catabolic)
        note: 'Luteal phase: BMR elevated ~150 kcal, shifted to higher fat oxidation, increased protein needs (Dr. Sims)',
      }
    default:
      return {
        calorieAdjustment: 0,
        carbMultiplier: 1.0,
        fatMultiplier: 1.0,
        proteinMultiplier: 1.0,
        note: 'Cycle phase unknown — using standard macros',
      }
  }
}

/**
 * Format cycle day display
 */
export function formatCycleDay(dayOfCycle: number, cycleLength: number): string {
  return `Day ${dayOfCycle} of ${cycleLength}`
}
