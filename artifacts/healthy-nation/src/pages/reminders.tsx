import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BellRing,
  Pill,
  Plus,
  Clock,
  Check,
  Trash2,
  CalendarDays,
  Bell,
  BellOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Frequency = "Once daily" | "Twice daily" | "Thrice daily" | "Every 6 hours" | "Weekly";

type Reminder = {
  id: string;
  medicine: string;
  dosage: string;
  frequency: Frequency;
  times: string[];
  startDate: string;
  endDate: string;
  notes: string;
  enabled: boolean;
  takenLog: Record<string, boolean>;
};

const STORAGE_KEY = "hn_med_reminders_v1";

const initialReminders: Reminder[] = [
  {
    id: "r1",
    medicine: "Metformin",
    dosage: "500 mg",
    frequency: "Twice daily",
    times: ["08:00", "20:00"],
    startDate: "2026-04-01",
    endDate: "2026-07-01",
    notes: "Take after meals",
    enabled: true,
    takenLog: {},
  },
  {
    id: "r2",
    medicine: "Vitamin D3",
    dosage: "60,000 IU",
    frequency: "Weekly",
    times: ["09:00"],
    startDate: "2026-04-01",
    endDate: "2026-10-01",
    notes: "Sunday morning",
    enabled: true,
    takenLog: {},
  },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function nextDose(times: string[]): { time: string; minutesAway: number } | null {
  if (!times.length) return null;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const sorted = [...times].sort();
  for (const t of sorted) {
    const [h, m] = t.split(":").map(Number);
    const target = h * 60 + m;
    if (target >= minutes) return { time: t, minutesAway: target - minutes };
  }
  const [h, m] = sorted[0].split(":").map(Number);
  return { time: sorted[0], minutesAway: 24 * 60 - minutes + (h * 60 + m) };
}

function formatAway(min: number) {
  if (min < 1) return "Now";
  if (min < 60) return `in ${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
}

export default function RemindersPage() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    if (typeof window === "undefined") return initialReminders;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return initialReminders;
  });
  const [open, setOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [, force] = useState(0);
  const firedRef = useRef<Set<string>>(new Set());
  const [form, setForm] = useState({
    medicine: "",
    dosage: "",
    frequency: "Once daily" as Frequency,
    times: "09:00",
    startDate: todayKey(),
    endDate: "",
    notes: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch {}
  }, [reminders]);

  // Tick every 30s for next-dose countdowns and to fire notifications
  useEffect(() => {
    const id = setInterval(() => {
      force((n) => n + 1);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const stamp = `${todayKey()}-${hh}:${mm}`;
      reminders.forEach((r) => {
        if (!r.enabled) return;
        r.times.forEach((t) => {
          const key = `${r.id}-${stamp}-${t}`;
          if (t === `${hh}:${mm}` && !firedRef.current.has(key)) {
            firedRef.current.add(key);
            toast({
              title: `Time for ${r.medicine}`,
              description: `${r.dosage} • ${r.notes || "Take your dose"}`,
            });
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(`Time for ${r.medicine}`, {
                  body: `${r.dosage} • ${r.notes || "Take your dose"}`,
                });
              } catch {}
            }
          }
        });
      });
    }, 30000);
    return () => clearInterval(id);
  }, [reminders, toast]);

  const requestNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({ title: "Notifications not supported in this browser", variant: "destructive" });
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") toast({ title: "Notifications enabled", description: "You'll be alerted at each dose time." });
  };

  const addReminder = () => {
    if (!form.medicine || !form.dosage) {
      toast({ title: "Missing details", description: "Medicine and dosage are required.", variant: "destructive" });
      return;
    }
    const times = form.times.split(",").map((t) => t.trim()).filter(Boolean);
    if (!times.length) {
      toast({ title: "Add at least one time", variant: "destructive" });
      return;
    }
    const r: Reminder = {
      id: `r-${Date.now()}`,
      medicine: form.medicine,
      dosage: form.dosage,
      frequency: form.frequency,
      times,
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes,
      enabled: true,
      takenLog: {},
    };
    setReminders((prev) => [r, ...prev]);
    setOpen(false);
    setForm({ medicine: "", dosage: "", frequency: "Once daily", times: "09:00", startDate: todayKey(), endDate: "", notes: "" });
    toast({ title: "Reminder added", description: `${r.medicine} scheduled at ${r.times.join(", ")}` });
  };

  const toggleEnabled = (id: string) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const removeReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Reminder removed" });
  };

  const markTaken = (id: string, time: string) => {
    const key = `${todayKey()}_${time}`;
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, takenLog: { ...r.takenLog, [key]: true } } : r,
      ),
    );
    toast({ title: "Marked as taken", description: `${time} dose logged.` });
  };

  const stats = useMemo(() => {
    const today = todayKey();
    let scheduled = 0;
    let taken = 0;
    reminders.forEach((r) => {
      if (!r.enabled) return;
      r.times.forEach((t) => {
        scheduled++;
        if (r.takenLog[`${today}_${t}`]) taken++;
      });
    });
    return { scheduled, taken, adherence: scheduled === 0 ? 0 : Math.round((taken / scheduled) * 100) };
  }, [reminders]);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            Medicine Reminders
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Schedule doses, get alerts at the right time, and track adherence.
          </motion.p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {notifPermission !== "granted" && (
            <Button variant="outline" onClick={requestNotifications} className="gap-2">
              <Bell className="h-4 w-4" /> Enable alerts
            </Button>
          )}
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Reminder
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active reminders</CardDescription>
            <CardTitle className="text-3xl">{reminders.filter((r) => r.enabled).length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">of {reminders.length} total</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Doses today</CardDescription>
            <CardTitle className="text-3xl">{stats.taken} / {stats.scheduled}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{stats.adherence}% adherence</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Notifications</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {notifPermission === "granted" ? (
                <><Bell className="h-6 w-6 text-emerald-600" /> On</>
              ) : (
                <><BellOff className="h-6 w-6 text-muted-foreground" /> Off</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {notifPermission === "granted" ? "Browser alerts are active." : "Enable for desktop alerts."}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {reminders.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Pill className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No reminders yet. Add your first medicine to start receiving dose alerts.
            </CardContent>
          </Card>
        )}
        {reminders.map((r, i) => {
          const upcoming = nextDose(r.times);
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${r.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <BellRing className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                          {r.medicine}
                          <Badge variant="secondary">{r.dosage}</Badge>
                          <Badge variant="outline">{r.frequency}</Badge>
                          {r.enabled && upcoming && (
                            <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
                              <Clock className="h-3 w-3" /> Next at {upcoming.time} ({formatAway(upcoming.minutesAway)})
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" /> {r.startDate || "—"}{r.endDate ? ` → ${r.endDate}` : ""}
                          </span>
                          {r.notes && <span>• {r.notes}</span>}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={r.enabled} onCheckedChange={() => toggleEnabled(r.id)} />
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeReminder(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {r.times.map((t) => {
                      const taken = r.takenLog[`${todayKey()}_${t}`];
                      return (
                        <button
                          key={t}
                          disabled={taken || !r.enabled}
                          onClick={() => markTaken(r.id, t)}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            taken
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : r.enabled
                                ? "border-border hover:bg-muted"
                                : "border-border opacity-50"
                          }`}
                        >
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t}
                          </div>
                          <div className="font-semibold flex items-center gap-1.5 mt-1">
                            {taken ? (<><Check className="h-4 w-4" /> Taken</>) : "Mark as taken"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" /> New medicine reminder
            </DialogTitle>
            <DialogDescription>Add a medicine, dosage, and the times you want to be reminded.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Medicine</Label>
              <Input value={form.medicine} onChange={(e) => setForm({ ...form, medicine: e.target.value })} placeholder="e.g. Paracetamol" />
            </div>
            <div>
              <Label className="text-xs">Dosage</Label>
              <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="500 mg" />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Once daily">Once daily</SelectItem>
                  <SelectItem value="Twice daily">Twice daily</SelectItem>
                  <SelectItem value="Thrice daily">Thrice daily</SelectItem>
                  <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Times (comma separated, 24h)</Label>
              <Input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} placeholder="08:00, 14:00, 20:00" />
            </div>
            <div>
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">End date (optional)</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Take after meals" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addReminder}>Save reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
