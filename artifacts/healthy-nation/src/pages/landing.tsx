import { SignInButton, SignUpButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Activity, Stethoscope, ShieldAlert, Pill, Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-secondary/40">
      <header className="flex items-center justify-between p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-semibold text-xl text-primary tracking-tight">Healthy Nation</span>
        </div>
        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <Button variant="ghost">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button>Get started</Button>
          </SignUpButton>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
            <Heart className="h-4 w-4" />
            Your personal healthcare companion
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Take charge of your{" "}
            <span className="text-primary">health journey</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Track vitals, consult AI for symptoms, book trusted doctors, manage medications, and order medicine — all in one calm, secure place.
          </p>
          <div className="flex items-center justify-center gap-3">
            <SignUpButton mode="modal">
              <Button size="lg" className="gap-2 px-8">
                Sign up free
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                Sign in
              </Button>
            </SignInButton>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
          {[
            { icon: Activity, title: "Vitals tracking", desc: "Heart rate, BP, glucose, sleep — all in one timeline." },
            { icon: Stethoscope, title: "AI symptom checker", desc: "Get instant triage for new symptoms, 24/7." },
            { icon: Pill, title: "Pharmacy delivery", desc: "Order prescribed medicines to your door." },
            { icon: ShieldAlert, title: "Emergency SOS", desc: "One tap alerts your contacts in a crisis." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="bg-card rounded-2xl p-6 border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary text-primary flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
