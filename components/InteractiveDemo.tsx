'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Home, Utensils, ClipboardCheck, Camera, ChevronRight,
  ArrowLeft, Brain, TrendingUp, Zap, Check, Activity, BarChart3
} from 'lucide-react'

// ─── Types ───
type Screen = 'home' | 'meals' | 'meal-photo' | 'meal-result' | 'checkin' | 'checkin-result' | 'trends'

// ─── Mini Fuel Score Ring ───
function MiniScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const sw = 6
  const r = (size - sw) / 2
  const c = r * 2 * Math.PI
  const off = c - (score / 100) * c
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ef4444'
  const zone = score >= 85 ? 'Locked In' : score >= 70 ? 'On Track' : score >= 50 ? 'Dial It In' : 'Red Flag'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round"
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.5, ease: 'easeOut' }} style={{ strokeDasharray: c }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-xl font-extrabold text-white font-mono">{score}</span>
        <span className="text-[8px] font-semibold" style={{ color }}>{zone}</span>
      </div>
    </div>
  )
}

// ─── Screen: Dashboard Home ───
function ScreenHome({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-white/50 text-[10px] font-medium tracking-wider uppercase">Good Morning</p>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Marcus Johnson</h3>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs">🔥</span>
            <span className="text-[9px] font-bold text-emerald-400">7 days</span>
          </div>
        </div>
        <p className="text-[10px] text-white/30">Football · Offensive Lineman</p>
      </div>

      <div className="flex flex-col items-center py-2">
        <MiniScoreRing score={82} size={100} />
        <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-emerald-500/10">
          <span className="text-emerald-400 text-xs">↑</span>
          <span className="text-[10px] text-white/60">+5 from yesterday</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <motion.button
          onClick={() => navigate('meals')}
          className="text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all"
          whileTap={{ scale: 0.97 }}
        >
          <p className="text-lg font-bold text-white font-mono">3</p>
          <p className="text-[8px] text-white/40 mt-0.5">Today&apos;s Meals</p>
        </motion.button>
        <div className="text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-lg font-bold text-white font-mono">5</p>
          <p className="text-[8px] text-white/40 mt-0.5">Check-ins</p>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-lg font-bold text-white font-mono">4</p>
          <p className="text-[8px] text-white/40 mt-0.5">🥩 Protein Streak</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <ClipboardCheck className="w-4 h-4" />, label: 'Check-in', screen: 'checkin' as Screen, color: 'from-emerald-500/20 to-emerald-700/10', iconColor: 'text-emerald-300' },
          { icon: <Utensils className="w-4 h-4" />, label: 'Log Meal', screen: 'meals' as Screen, color: 'from-blue-500/20 to-blue-700/10', iconColor: 'text-blue-300' },
          { icon: <BarChart3 className="w-4 h-4" />, label: 'Body Comp', screen: 'trends' as Screen, color: 'from-purple-500/20 to-purple-700/10', iconColor: 'text-purple-300' },
          { icon: <TrendingUp className="w-4 h-4" />, label: 'Trends', screen: 'trends' as Screen, color: 'from-amber-500/20 to-amber-700/10', iconColor: 'text-amber-300' },
        ].map((a) => (
          <motion.button
            key={a.label}
            onClick={() => navigate(a.screen)}
            className={`flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-br ${a.color} border border-white/[0.06] hover:border-white/[0.12] transition-all text-left`}
            whileTap={{ scale: 0.97 }}
          >
            <div className={a.iconColor}>{a.icon}</div>
            <span className="text-xs font-semibold text-white/80">{a.label}</span>
            <ChevronRight className="w-3 h-3 text-white/20 ml-auto" />
          </motion.button>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Nutrition</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-white/50">Calories</span>
          <span className="text-[10px] font-mono text-white/40">2,847 / 3,600</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }} animate={{ width: '79%' }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-white/50">Protein</span>
          <span className="text-[10px] font-mono text-white/40">156g / 180g</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-blue-500"
            initial={{ width: 0 }} animate={{ width: '87%' }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
          />
        </div>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Today&apos;s Check-in</span>
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Complete</span>
        </div>
        {[
          { label: 'Sleep', value: 8, emoji: '😴' },
          { label: 'Stress', value: 3, emoji: '🧠' },
          { label: 'Energy', value: 9, emoji: '⚡' },
          { label: 'Soreness', value: 4, emoji: '💪' },
          { label: 'Hydration', value: 7, emoji: '💧' },
        ].map((m) => (
          <div key={m.label} className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-[10px] text-white/50 flex items-center gap-1"><span>{m.emoji}</span> {m.label}</span>
              <span className="text-[10px] font-mono text-emerald-400">{m.value}/10</span>
            </div>
            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div className={`h-full rounded-full ${m.value >= 7 ? 'bg-emerald-500' : m.value >= 5 ? 'bg-blue-500' : m.value >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                initial={{ width: 0 }} animate={{ width: `${(m.value / 10) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Check-in ───
function ScreenCheckin({ navigate }: { navigate: (s: Screen) => void }) {
  const [sleep, setSleep] = useState(7)
  const [stress, setStress] = useState(5)
  const [energy, setEnergy] = useState(7)
  const [soreness, setSoreness] = useState(5)
  const [hydration, setHydration] = useState(7)

  const calcScore = () => {
    const sleepScore = (sleep / 10) * 25
    const stressScore = ((10 - stress) / 10) * 20
    const energyScore = (energy / 10) * 25
    const sorenessScore = ((10 - soreness) / 10) * 15
    const hydrationScore = (hydration / 10) * 15
    return Math.round(sleepScore + stressScore + energyScore + sorenessScore + hydrationScore)
  }

  const score = calcScore()
  const getColor = (s: number) => s >= 85 ? 'text-emerald-400' : s >= 70 ? 'text-blue-400' : s >= 50 ? 'text-amber-400' : 'text-red-400'
  const getZone = (s: number) => s >= 85 ? '🔥 Locked In' : s >= 70 ? '💪 On Track' : s >= 50 ? '⚡ Dial It In' : '🚨 Red Flag'

  const sliders = [
    { label: 'Sleep Quality', value: sleep, set: setSleep, emoji: '😴', desc: 'How well did you sleep?' },
    { label: 'Stress Level', value: stress, set: setStress, emoji: '🧠', desc: 'Lower is better' },
    { label: 'Energy Level', value: energy, set: setEnergy, emoji: '⚡', desc: 'How energized do you feel?' },
    { label: 'Soreness', value: soreness, set: setSoreness, emoji: '💪', desc: 'Lower is better' },
    { label: 'Hydration', value: hydration, set: setHydration, emoji: '💧', desc: 'How hydrated are you?' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('home')} className="text-emerald-400"><ArrowLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-bold text-white">Daily Check-in</h3>
      </div>

      <div className="flex flex-col items-center py-3">
        <MiniScoreRing score={score} size={90} />
        <span className={`text-xs font-semibold mt-1 ${getColor(score)}`}>{getZone(score)}</span>
        <span className="text-[9px] text-white/30 mt-0.5">Score updates as you adjust</span>
      </div>

      {sliders.map((s) => (
        <div key={s.label} className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/60 flex items-center gap-1.5">
              <span>{s.emoji}</span> {s.label}
            </span>
            <span className="text-xs font-mono text-emerald-400">{s.value}/10</span>
          </div>
          <input type="range" min={1} max={10} value={s.value} onChange={(e) => s.set(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/[0.08] cursor-pointer accent-emerald-500
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg"
          />
          <p className="text-[9px] text-white/25">{s.desc}</p>
        </div>
      ))}

      <motion.button
        onClick={() => navigate('checkin-result')}
        className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        Submit Check-in
      </motion.button>
    </div>
  )
}

// ─── Screen: Check-in Result ───
function ScreenCheckinResult({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="space-y-4 flex flex-col items-center justify-center min-h-[300px]">
      <motion.div
        className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
      >
        <Check className="w-8 h-8 text-emerald-400" />
      </motion.div>
      <h3 className="text-base font-bold text-white">Check-in Saved!</h3>
      <div className="flex flex-col items-center gap-1">
        <MiniScoreRing score={82} size={80} />
      </div>
      <p className="text-xs text-white/40 text-center">Your Fuel Score has been updated.<br />Your coach can now see your status.</p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="text-sm">🔥</span>
        <span className="text-xs font-bold text-emerald-400">7 day streak! +3 bonus</span>
      </div>
      <motion.button onClick={() => navigate('home')} className="px-6 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold" whileTap={{ scale: 0.97 }}>
        Back to Dashboard
      </motion.button>
    </div>
  )
}

// ─── Screen: Meal Logging ───
function ScreenMeals({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('home')} className="text-emerald-400"><ArrowLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-bold text-white">Log a Meal</h3>
      </div>

      <motion.button
        onClick={() => navigate('meal-photo')}
        className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all"
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Camera className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white/80">Snap a Photo</p>
          <p className="text-[10px] text-white/30 mt-0.5">AI will analyze your meal instantly</p>
        </div>
      </motion.button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] text-white/20 uppercase">or enter manually</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      <div className="space-y-2">
        <input placeholder="What did you eat?" className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:outline-none transition-colors" readOnly />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Calories" className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:outline-none" readOnly />
          <input placeholder="Protein (g)" className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:outline-none" readOnly />
        </div>
        <motion.button
          onClick={() => navigate('meal-result')}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          Log Meal
        </motion.button>
      </div>
    </div>
  )
}

// ─── Screen: Meal Photo Analysis ───
function ScreenMealPhoto({ navigate }: { navigate: (s: Screen) => void }) {
  useEffect(() => {
    const t = setTimeout(() => { navigate('meal-result') }, 2500)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('meals')} className="text-emerald-400"><ArrowLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-bold text-white">AI Analysis</h3>
      </div>

      <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-emerald-900/30 to-slate-900/50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-green-900/10 to-emerald-900/20" />
        <div className="text-6xl">🥗</div>
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full border-2 border-emerald-500/50"
            animate={{ scale: [1, 1.2, 1], borderColor: ['rgba(34,197,94,0.3)', 'rgba(34,197,94,0.8)', 'rgba(34,197,94,0.3)'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="mt-6 flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60 font-medium">Analyzing your meal...</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Screen: Meal Result ───
function ScreenMealResult({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('home')} className="text-emerald-400"><ArrowLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-bold text-white">Meal Analysis</h3>
      </div>

      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">AI Result</span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">High Confidence</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Calories', value: '680', color: 'text-emerald-300' },
          { label: 'Protein', value: '52g', color: 'text-blue-300' },
          { label: 'Carbs', value: '64g', color: 'text-amber-300' },
          { label: 'Fat', value: '22g', color: 'text-cyan-300' },
        ].map((m) => (
          <motion.div key={m.label} className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            <p className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
            <p className="text-[8px] text-white/30 mt-0.5">{m.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="h-3 rounded-full overflow-hidden flex">
        <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: '38%' }} transition={{ duration: 1, delay: 0.3 }} />
        <motion.div className="h-full bg-amber-500" initial={{ width: 0 }} animate={{ width: '37%' }} transition={{ duration: 1, delay: 0.5 }} />
        <motion.div className="h-full bg-cyan-500" initial={{ width: 0 }} animate={{ width: '25%' }} transition={{ duration: 1, delay: 0.7 }} />
      </div>
      <div className="flex justify-between text-[8px] text-white/30">
        <span>Protein 38%</span><span>Carbs 37%</span><span>Fat 25%</span>
      </div>

      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">AI Coach</span>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed">
          Great protein-rich meal! This grilled chicken bowl hits 29% of your daily protein target in one sitting. Consider adding a complex carb like sweet potato to fuel your afternoon practice.
        </p>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Updated Progress</span>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/50">Daily Calories</span>
          <span className="text-[10px] font-mono text-white/40">2,847 / 3,600</span>
        </div>
        <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: '58%' }} animate={{ width: '78%' }} transition={{ duration: 1.2, delay: 0.5 }} />
        </div>
      </div>

      <motion.button
        onClick={() => navigate('home')}
        className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        <Check className="w-3.5 h-3.5" /> Done
      </motion.button>
    </div>
  )
}

// ─── Screen: Trends / Body Comp ───
function ScreenTrends({ navigate }: { navigate: (s: Screen) => void }) {
  const weekScores = [72, 68, 75, 78, 80, 77, 82]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxScore = 100
  const chartH = 120

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('home')} className="text-emerald-400"><ArrowLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-bold text-white">Trends</h3>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">7-Day Fuel Score</span>
          <span className="text-[10px] text-emerald-400 font-semibold">Avg: 76</span>
        </div>
        <div className="flex items-end justify-between gap-1.5" style={{ height: chartH }}>
          {weekScores.map((s, i) => {
            const h = (s / maxScore) * chartH
            const color = s >= 85 ? 'bg-emerald-500' : s >= 70 ? 'bg-blue-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500'
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] font-mono text-white/40">{s}</span>
                <motion.div
                  className={`w-full rounded-t-md ${color} ${i === weekScores.length - 1 ? 'opacity-100' : 'opacity-60'}`}
                  initial={{ height: 0 }} animate={{ height: h }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                />
                <span className="text-[8px] text-white/30">{days[i]}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Body Composition</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Weight', value: '215', unit: 'lbs', change: '-2.3', positive: true },
            { label: 'Body Fat', value: '14.2', unit: '%', change: '-0.8', positive: true },
            { label: 'Lean Mass', value: '184.5', unit: 'lbs', change: '+1.2', positive: true },
          ].map((m) => (
            <div key={m.label} className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <p className="text-sm font-bold text-white font-mono">{m.value}</p>
              <p className="text-[8px] text-white/30">{m.unit}</p>
              <p className={`text-[9px] font-semibold mt-1 ${m.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {m.change}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-white/25 text-center">Last scan: Mar 28, 2026</p>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Streaks & Consistency</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
            <span className="text-lg">🔥</span>
            <div>
              <p className="text-sm font-bold text-white">7 days</p>
              <p className="text-[8px] text-white/30">Check-in Streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
            <span className="text-lg">🥩</span>
            <div>
              <p className="text-sm font-bold text-white">4 days</p>
              <p className="text-[8px] text-white/30">Protein Streak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Bottom Nav ───
function BottomNav({ screen, navigate }: { screen: Screen; navigate: (s: Screen) => void }) {
  const items = [
    { icon: <Home className="w-4 h-4" />, label: 'Home', screen: 'home' as Screen },
    { icon: <ClipboardCheck className="w-4 h-4" />, label: 'Check-in', screen: 'checkin' as Screen },
    { icon: <Utensils className="w-4 h-4" />, label: 'Meals', screen: 'meals' as Screen },
    { icon: <TrendingUp className="w-4 h-4" />, label: 'Trends', screen: 'trends' as Screen },
  ]
  const active = (s: Screen) => screen === s || (s === 'meals' && (screen === 'meal-photo' || screen === 'meal-result')) || (s === 'checkin' && screen === 'checkin-result')

  return (
    <div className="flex justify-around items-center py-2 border-t border-white/[0.05] bg-[#0a0c18]/80 backdrop-blur-sm">
      {items.map((item) => (
        <button key={item.label} onClick={() => navigate(item.screen)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active(item.screen) ? 'text-emerald-400' : 'text-white/30 hover:text-white/50'}`}
        >
          {item.icon}
          <span className="text-[8px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Main Interactive Demo ───
export default function InteractiveDemo({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<Screen>('home')
  const navigate = (s: Screen) => setScreen(s)

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-[380px]"
        initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-xs">
          <span>Close Demo</span> <X className="w-4 h-4" />
        </button>

        <div className="absolute -top-12 left-0 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-400/80 font-medium">Interactive Demo</span>
        </div>

        <div className="rounded-[2.5rem] border border-white/[0.08] bg-gradient-to-b from-[#0c0e1a] to-[#0a0c18] p-1 shadow-2xl shadow-black/40">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-b-2xl z-10" />

          <div className="rounded-[2.2rem] bg-gradient-to-b from-[#0d101e] to-[#0a0c18] overflow-hidden flex flex-col" style={{ height: 'min(680px, 80vh)' }}>
            <div className="flex-1 overflow-y-auto p-4 pt-8 scrollbar-hide">
              <AnimatePresence mode="wait">
                <motion.div
                  key={screen}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {screen === 'home' && <ScreenHome navigate={navigate} />}
                  {screen === 'checkin' && <ScreenCheckin navigate={navigate} />}
                  {screen === 'checkin-result' && <ScreenCheckinResult navigate={navigate} />}
                  {screen === 'meals' && <ScreenMeals navigate={navigate} />}
                  {screen === 'meal-photo' && <ScreenMealPhoto navigate={navigate} />}
                  {screen === 'meal-result' && <ScreenMealResult navigate={navigate} />}
                  {screen === 'trends' && <ScreenTrends navigate={navigate} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <BottomNav screen={screen} navigate={navigate} />
          </div>
        </div>

        <div className="absolute -inset-20 bg-emerald-600/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      </motion.div>
    </motion.div>
  )
}
