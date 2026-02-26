'use client';

import { useState } from 'react';
import {
  UserRound,
  MapPin,
  Globe,
  Pencil,
  X,
  Camera,
  BookOpen,
  Trophy,
  Clock,
  Flame,
  Star,
  Shield,
  Crown,
  Gem,
  Sparkles,
  ChevronRight,
  Save,
} from 'lucide-react';

const STATIC_PROFILE = {
  name: 'Jana Jana',
  role: 'Pedagog',
  bio: 'Učím se ráda',
  location: 'ústí, Česká republika',
  website: 'www.seznam.cz',
  joinedDate: 'Leden 2026',
};

const STATIC_STATS = [
  { icon: BookOpen, label: 'Kurzů dokončeno', value: '4', color: 'text-[#857AD2]' },
  { icon: Trophy, label: 'Získané odznaky', value: '12', color: 'text-[#B1475C]' },
  { icon: Clock, label: 'Hodin studia', value: '38', color: 'text-[#00C896]' },
  { icon: Flame, label: 'Denní série', value: '7', color: 'text-orange-500' },
];

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond';

const TIER_CONFIG = {
  bronze: {
    icon: Star,
    gradient: 'from-amber-600 to-orange-500',
    ring: 'ring-amber-400/50',
    cardBg: 'bg-amber-50',
    textColor: 'text-amber-700',
    label: 'Bronzový',
  },
  silver: {
    icon: Shield,
    gradient: 'from-slate-300 to-slate-500',
    ring: 'ring-slate-400/50',
    cardBg: 'bg-slate-50',
    textColor: 'text-slate-600',
    label: 'Stříbrný',
  },
  gold: {
    icon: Crown,
    gradient: 'from-yellow-400 to-amber-500',
    ring: 'ring-yellow-400/50',
    cardBg: 'bg-yellow-50',
    textColor: 'text-amber-600',
    label: 'Zlatý',
  },
  emerald: {
    icon: Gem,
    gradient: 'from-emerald-400 to-emerald-600',
    ring: 'ring-emerald-400/50',
    cardBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    label: 'Smaragdový',
  },
  diamond: {
    icon: Sparkles,
    gradient: 'from-cyan-300 via-blue-400 to-violet-500',
    ring: 'ring-cyan-400/50',
    cardBg: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    label: 'Diamantový',
  },
};

const STATIC_ACHIEVEMENTS: {
  id: number;
  title: string;
  description: string;
  tier: AchievementTier;
  unlocked: boolean;
}[] = [
  { id: 1, title: 'První krok',     description: 'Dokončil/a první lekci',        tier: 'bronze',  unlocked: true  },
  { id: 2, title: 'Čtenář',         description: 'Přečetl/a 10 lekcí',            tier: 'bronze',  unlocked: true  },
  { id: 3, title: 'Na vlně',        description: '7 dní studia v řadě',           tier: 'silver',  unlocked: true  },
  { id: 4, title: 'Perfekcionista', description: '100 % v kvízu',                 tier: 'silver',  unlocked: true  },
  { id: 5, title: 'Rychlopalec',    description: 'Kurz za méně než hodinu',       tier: 'gold',    unlocked: true  },
  { id: 6, title: 'AI Průkopník',   description: 'Dokončil/a kurz o AI',          tier: 'gold',    unlocked: true  },
  { id: 7, title: 'Mistr obsahu',   description: 'Dokončil/a 5 kurzů',            tier: 'emerald', unlocked: false },
  { id: 8, title: 'Legenda AI',     description: 'Dokončil/a všechny kurzy',      tier: 'diamond', unlocked: false },
];

const STATIC_COURSES = [
  {
    id: 1,
    title: 'Co je prompt a jak ho napsat',
    progress: 100,
    modules: 5,
    done: 5,
    status: 'Dokončeno',
  },
  {
    id: 2,
    title: 'Techniky efektivního promptování',
    progress: 68,
    modules: 6,
    done: 4,
    status: 'Probíhá',
  },
  {
    id: 3,
    title: 'AI ve školní výuce',
    progress: 20,
    modules: 8,
    done: 2,
    status: 'Probíhá',
  },
  {
    id: 4,
    title: 'Základy strojového učení',
    progress: 0,
    modules: 7,
    done: 0,
    status: 'Nezačato',
  },
];

// Sub-components

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-1.5 flex-1 min-w-[100px]">
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function AchievementCard({
  title,
  description,
  tier,
  unlocked,
}: {
  title: string;
  description: string;
  tier: AchievementTier;
  unlocked: boolean;
}) {
  const config = TIER_CONFIG[tier];
  const TierIcon = config.icon;

  return (
    <div
      className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-transform hover:scale-105 cursor-default ${
        unlocked ? config.cardBg : 'bg-gray-50'
      }`}
    >
      {unlocked ? (
        /* ── Unlocked badge ── */
        <div className="relative pb-3">
          <div
            className={`relative w-[72px] h-[72px] rounded-full bg-gradient-to-br ${
              config.gradient
            } flex items-center justify-center shadow-lg ring-4 ${config.ring}`}
          >
            {/* Inner sheen */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            {/* Bottom shadow lip */}
            <div className="absolute bottom-0 inset-x-0 h-1/3 rounded-b-full bg-black/10 pointer-events-none" />
            <TierIcon
              className="w-7 h-7 text-white relative z-10"
              strokeWidth={1.6}
            />
          </div>
          {/* Tier label pill */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white rounded-full px-2 py-[3px] shadow-sm border border-gray-100 whitespace-nowrap">
            <span
              className={`text-[9px] font-bold uppercase tracking-wide ${config.textColor}`}
            >
              {config.label}
            </span>
          </div>
        </div>
      ) : (
        /* ── Locked badge ── */
        <div className="relative pb-3">
          <div className="w-[72px] h-[72px] rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-300">?</span>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white rounded-full px-2 py-[3px] shadow-sm border border-gray-100 whitespace-nowrap">
            <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
              Zamčeno
            </span>
          </div>
        </div>
      )}
      <div className="text-center mt-1">
        <p className={`text-sm font-semibold leading-tight ${
          unlocked ? 'text-gray-800' : 'text-gray-400'
        }`}>
          {unlocked ? title : '???'}
        </p>
        <p className="text-xs text-gray-500 leading-tight mt-0.5">
          {unlocked ? description : 'Ještě nezískaný'}
        </p>
      </div>
    </div>
  );
}

function CourseProgressRow({
  title,
  progress,
  modules,
  done,
  status,
}: (typeof STATIC_COURSES)[0]) {
  const statusColors: Record<string, string> = {
    Dokončeno: 'bg-green-100 text-green-700',
    Probíhá: 'bg-blue-100 text-blue-700',
    Nezačato: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="flex items-center gap-4 py-3 group">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#B1475C] to-[#857AD2] flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[status]}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {done}/{modules}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
    </div>
  );
}

function EditProfileForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F0F0F0' }}
    >
      {/* Edit banner */}
      <div
        className="relative w-full h-48 sm:h-64 flex items-end"
      >

        {/* Cover photo upload button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors group">
            <div className="w-12 h-12 rounded-full bg-black/30 border-2 border-white/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Změnit obrázek pozadí</span>
          </button>
        </div>

        {/* Avatar upload – positioned bottom-left */}
        <div className="relative z-10 px-6 sm:px-10 pb-0 translate-y-1/2">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32">
            <div className="w-full h-full rounded-full border-4 border-white bg-gradient-to-br from-[#B1475C] to-[#857AD2] flex items-center justify-center shadow-lg">
              <UserRound className="w-10 h-10 sm:w-14 sm:h-14 text-white" strokeWidth={1.2} />
            </div>
            <button className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow hover:bg-gray-50 transition-colors">
              <Camera className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Form body */}
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px] pb-12"
        style={{ maxWidth: '1440px', width: '100%', paddingTop: '80px' }}
      >
        <div className="max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Upravit profil</h1>
            <button
              onClick={onCancel}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" /> Zrušit
            </button>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <Section title="Základní informace">
              <FormField label="Zobrazované jméno" placeholder="Jana Nováková" />
              <FormField label="Titul / Role" placeholder="Pedagog & AI nadšenec" />
              <FormTextarea
                label="Krátké bio"
                placeholder="Napište něco o sobě..."
                rows={4}
              />
            </Section>

            <div className="border-t border-gray-100" />

            <Section title="Kontakt & odkaz">
              <FormField
                label="Město / region"
                placeholder="Praha, Česká republika"
                icon={<MapPin className="w-4 h-4 text-gray-400" />}
              />
              <FormField
                label="Webová stránka"
                placeholder="vase-stranka.cz"
                icon={<Globe className="w-4 h-4 text-gray-400" />}
              />
            </Section>

            <div className="border-t border-gray-100" />

            <Section title="Soukromí">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 group-hover:border-[#857AD2] transition-colors" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Veřejný profil</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ostatní uživatelé uvidí váš profil a odznaky
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 group-hover:border-[#857AD2] transition-colors" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Zobrazovat statistiky</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Povolit zobrazení statistik na profilu
                  </p>
                </div>
              </label>
            </Section>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 mt-6">
            <button
              className="flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-lg shadow transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)',
              }}
            >
              <Save className="w-4 h-4" />
              Uložit změny
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-gray-600 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function FormField({
  label,
  placeholder,
  icon,
}: {
  label: string;
  placeholder: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>
        )}
        <input
          type="text"
          placeholder={placeholder}
          className={`w-full border border-gray-200 rounded-lg py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#857AD2]/30 focus:border-[#857AD2] transition-colors ${
            icon ? 'pl-9 pr-4' : 'px-4'
          }`}
        />
      </div>
    </div>
  );
}

function FormTextarea({
  label,
  placeholder,
  rows = 3,
}: {
  label: string;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#857AD2]/30 focus:border-[#857AD2] transition-colors resize-none"
      />
    </div>
  );
}

//View Profile

function ViewProfile({ onEdit }: { onEdit: () => void }) {
  const [activeTab, setActiveTab] = useState<'achievements' | 'courses'>('achievements');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
      {/* Cover / Banner */}
      <div
        className="relative w-full"
        style={{
          height: 'clamp(160px, 25vw, 260px)',
          background:
            'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, #3C3C3C 60%, #1a1a2e 100%)',
        }}
      >

        {/* Edit button – top right */}
        <button
          onClick={onEdit}
          className="absolute top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-black/25 hover:bg-black/40 rounded-lg border border-white/20 backdrop-blur-sm transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
          Upravit profil
        </button>

        {/* Avatar – bottom left, overflows */}
        <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-10 lg:left-[100px]">
          <div
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #B1475C 0%, #857AD2 100%)',
            }}
          >
            <UserRound className="w-10 h-10 sm:w-14 sm:h-14 text-white" strokeWidth={1.2} />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px]"
        style={{ maxWidth: '1440px', width: '100%', paddingTop: '64px' }}
      >
        {/* Identity row */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{STATIC_PROFILE.name}</h1>
            <p className="text-base text-gray-500 mt-0.5">{STATIC_PROFILE.role}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {STATIC_PROFILE.location}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {STATIC_PROFILE.website}
              </span>
              <span className="text-gray-300">·</span>
              <span>Člen od {STATIC_PROFILE.joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-2xl mb-8">
          {STATIC_PROFILE.bio}
        </p>

        {/*  Stats row  */}
        <div className="flex flex-wrap gap-3 mb-10">
          {STATIC_STATS.map((s) => (
            <StatCard key={s.label} {...s} icon={s.icon} />
          ))}
        </div>

        {/*  Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {(['achievements', 'courses'] as const).map((tab) => {
            const labels = { achievements: 'Odznaky & Achievementy', courses: 'Moje kurzy' };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {labels[tab]}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content*/}
        {activeTab === 'achievements' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Odznaky</h2>
              <span className="text-sm text-gray-500">
                {STATIC_ACHIEVEMENTS.filter((a) => a.unlocked).length} / {STATIC_ACHIEVEMENTS.length} odemčeno
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-12">
              {STATIC_ACHIEVEMENTS.map((a) => (
                <AchievementCard key={a.id} {...a} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="pb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Moje kurzy</h2>
              <span className="text-sm text-gray-500">
                {STATIC_COURSES.filter((c) => c.status === 'Dokončeno').length} dokončeno
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 px-4 sm:px-6">
              {STATIC_COURSES.map((course) => (
                <CourseProgressRow key={course.id} {...course} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// page

export default function ProfilPage() {
  const [isEditing, setIsEditing] = useState(false);

  return isEditing ? (
    <EditProfileForm onCancel={() => setIsEditing(false)} />
  ) : (
    <ViewProfile onEdit={() => setIsEditing(true)} />
  );
}
