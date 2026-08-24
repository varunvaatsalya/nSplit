import { Users, ReceiptText, Calculator, Handshake, Plane, Home, Heart, Briefcase, FileText } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Users,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    title: "Create a Group",
    desc: "Add your friends, roommates, or family to a shared space.",
  },
  {
    num: "02",
    icon: ReceiptText,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
    title: "Add Expenses",
    desc: "Log bills on the go. Who paid and what was it for?",
  },
  {
    num: "03",
    icon: Calculator,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-400/10",
    title: "Split Magic",
    desc: "We do the math instantly. Balances update in real-time.",
  },
  {
    num: "04",
    icon: FileText,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-400/10",
    title: "Export & Share",
    desc: "Generate clean PDF balance sheets to share with the group anytime.",
  },
  {
    num: "05",
    icon: Handshake,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    title: "Settle Up",
    desc: "Pay exactly what you owe and keep friendships intact.",
  },
];

const GROUPS = [
  {
    icon: Plane,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    title: "Trips & Travel",
    desc: "Track hotels, food, transport, tickets and activities without carrying a notepad.",
  },
  {
    icon: Home,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    title: "Roommates",
    desc: "Split rent, groceries, internet, utilities and everyday household expenses fairly.",
  },
  {
    icon: Heart,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-400/10",
    title: "Friends",
    desc: "Keep dinners, outings, concert tickets and weekend expenses simple and clear.",
  },
  {
    icon: Heart,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-400/10",
    title: "Couples",
    desc: "Manage shared everyday expenses without needing a joint bank account yet.",
  },
  {
    icon: Users,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
    title: "Family",
    desc: "Track expenses during family vacations, weddings, events and shared gifts.",
  },
  {
    icon: Briefcase,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-400/10",
    title: "Teams & Co-workers",
    desc: "Handle shared lunches, office gifts, events and small team expenses.",
  },
];

export default function HowItWorksGrid() {
  return (
    <div className="w-full relative z-12 bg-background text-foreground">
      {/* 1. How it Works Steps */}
      <section id="how-it-works" className="relative py-24 border-t border-border/60 overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl opacity-40" />

        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          
          {/* Section Headers */}
          <div className="flex flex-col gap-3 items-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              How it works
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Five simple steps to financial harmony.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="flex flex-col items-center text-center px-2 select-none group">
                  {/* Step Ring Widget */}
                  <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card/50 shadow-lg group-hover:scale-105 group-hover:border-primary/20 transition-all duration-300">
                    {/* Number Badge */}
                    <div className="absolute -top-1.5 -left-1.5 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground font-sans shadow-md">
                      {step.num}
                    </div>
                    {/* Centered Icon */}
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center ${step.iconBg} ${step.iconColor}`}>
                      <Icon className="h-5.5 w-5.5" />
                    </div>
                  </div>

                  {/* Text descriptions */}
                  <h4 className="text-sm font-extrabold text-foreground tracking-tight">
                    {step.title}
                  </h4>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 2. Built for Every Group Case Grid */}
      <section id="use-cases" className="relative py-24 border-t border-border/60 overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl opacity-40" />

        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          
          {/* Section Headers */}
          <div className="flex flex-col gap-3 items-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Built for every group
            </h2>
            <p className="text-sm text-muted-foreground font-medium max-w-lg leading-normal">
              From weekend getaways to long-term flatmates, nSplit adapts to how you share life.
            </p>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="bg-card/60 border border-border rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col items-start gap-4 text-left transition-all duration-300 hover:scale-[1.02] hover:border-border/80 select-none">
                  {/* Rounded Icon box */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${group.iconBg} ${group.iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {/* Text */}
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-extrabold text-foreground tracking-tight">
                      {group.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-normal">
                      {group.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>
    </div>
  );
}
