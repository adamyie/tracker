// Starting lists. Categories, budgets and habits came over from the original All-in-One Tracker artifact.
export const PALETTE = ["#FF8A5B", "#A86B3C", "#FF6FA5", "#4DB5FF", "#7C5CFF", "#F5B400", "#2EC4B6", "#E0569B", "#2EC98A", "#FF7A45", "#B07CFF", "#8A97A8"];

export const SOURCES = [
  { name: "Gaji", icon: "💼" },
  { name: "Uang saku", icon: "🎒" },
  { name: "Transfer", icon: "🔁" },
  { name: "Bonus", icon: "🎉" },
  { name: "Lainnya", icon: "✨" },
];

export const GROUP_ICON = { Dada: "🛡️", Bahu: "🥥", Punggung: "🦅", Kaki: "🦵", Bokong: "🍑", Lengan: "💪", Core: "🎯", Kardio: "❤️‍🔥", Other: "⭐" };

// unit: "reps" (default), "sec" or "min"
const LIB = {
  Dada: ["Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Bench Press", "Incline Dumbbell Press", "Dumbbell Fly", "Cable Fly", "Pec Deck", "Chest Press Machine", "Push Up", "Chest Dips"],
  Bahu: ["Overhead Press", "Dumbbell Shoulder Press", "Arnold Press", "Shoulder Press Machine", "Lateral Raise", "Cable Lateral Raise", "Front Raise", "Rear Delt Fly", "Face Pull", "Upright Row", "Shrug"],
  Punggung: ["Pull Up", "Chin Up", "Lat Pulldown", "Close-Grip Pulldown", "Barbell Row", "Dumbbell Row", "Seated Cable Row", "T-Bar Row", "Chest-Supported Row", "Straight-Arm Pulldown", "Deadlift", "Rack Pull", "Back Extension"],
  Kaki: ["Squat", "Front Squat", "Hack Squat", "Goblet Squat", "Leg Press", "Bulgarian Split Squat", "Lunge", "Walking Lunge", "Step Up", "Leg Extension", "Leg Curl", "Seated Leg Curl", "Romanian Deadlift", "Calf Raise", "Seated Calf Raise"],
  Bokong: ["Hip Thrust", "Glute Bridge", "Cable Kickback", "Hip Abduction", "Sumo Deadlift"],
  Lengan: ["Bicep Curl", "Barbell Curl", "Hammer Curl", "Preacher Curl", "Incline Dumbbell Curl", "Cable Curl", "Concentration Curl", "Tricep Pushdown", "Overhead Tricep Extension", "Skull Crusher", "Close-Grip Bench Press", "Tricep Dips", "Wrist Curl"],
  Core: ["Plank|sec", "Side Plank|sec", "Crunch", "Cable Crunch", "Hanging Leg Raise", "Russian Twist", "Ab Wheel Rollout", "Dead Bug", "Bicycle Crunch", "Mountain Climber"],
  Kardio: ["Treadmill|min", "Lari|min", "Sepeda Statis|min", "Rowing Machine|min", "Elliptical|min", "Stair Climber|min", "Lompat Tali|min", "Burpee", "Kettlebell Swing", "Farmer's Walk|sec", "Battle Ropes|sec"],
};
export const LIBRARY = Object.entries(LIB).flatMap(([group, arr]) => arr.map((s) => { const [name, unit = "reps"] = s.split("|"); return { name, group, unit }; }));
export const LIB_VERSION = 2;

export const DEFAULT_LISTS = {
  lib: LIB_VERSION,
  categories: [
    { name: "Makan", icon: "🍚", budget: 2000000, color: "#FF8A5B" },
    { name: "Kopi", icon: "☕", budget: 400000, color: "#A86B3C" },
    { name: "Jajan", icon: "🍡", budget: 300000, color: "#FF6FA5" },
    { name: "Transport", icon: "🛵", budget: 800000, color: "#4DB5FF" },
    { name: "Belanja", icon: "🛒", budget: 700000, color: "#7C5CFF" },
    { name: "Tagihan", icon: "🧾", budget: 1000000, color: "#F5B400" },
    { name: "Pulsa & Internet", icon: "📶", budget: 200000, color: "#2EC4B6" },
    { name: "Hiburan", icon: "🎬", budget: 400000, color: "#E0569B" },
    { name: "Kesehatan", icon: "💊", budget: 300000, color: "#2EC98A" },
    { name: "Olahraga", icon: "🏸", budget: 400000, color: "#FF7A45" },
    { name: "Hadiah & Sedekah", icon: "🎁", budget: 300000, color: "#B07CFF" },
    { name: "Lainnya", icon: "📦", budget: 300000, color: "#8A97A8" },
  ],
  exercises: LIBRARY.map((x) => ({ ...x })),
  habits: [
    { name: "Gym", icon: "🏋️", target: 3, active: true, color: "#7C5CFF" },
    { name: "Tidur 7 jam", icon: "😴", target: 7, active: true, color: "#4DB5FF" },
    { name: "Baca 20 menit", icon: "📖", target: 5, active: true, color: "#FF8A5B" },
    { name: "Air 2 liter", icon: "💧", target: 7, active: true, color: "#2EC4B6" },
  ],
};
