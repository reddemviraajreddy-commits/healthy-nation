import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Plus,
  Building2,
  CalendarClock,
  IndianRupee,
  FileText,
  Phone,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PolicyType = "Health" | "Life" | "Accident" | "Critical Illness" | "Family Floater";

type Policy = {
  id: string;
  provider: string;
  policyNumber: string;
  planName: string;
  type: PolicyType;
  coverage: number;
  premium: number;
  startDate: string;
  renewalDate: string;
  network: string;
  contact: string;
};

const initialPolicies: Policy[] = [
  {
    id: "p1",
    provider: "Star Health",
    policyNumber: "SH-2024-78421",
    planName: "Family Health Optima",
    type: "Family Floater",
    coverage: 1000000,
    premium: 18500,
    startDate: "2024-08-01",
    renewalDate: "2026-08-01",
    network: "11,500+ hospitals",
    contact: "+91-44-2828-8800",
  },
  {
    id: "p2",
    provider: "HDFC Ergo",
    policyNumber: "HDFC-CI-44091",
    planName: "Critical Illness Shield",
    type: "Critical Illness",
    coverage: 2500000,
    premium: 9200,
    startDate: "2025-02-15",
    renewalDate: "2026-02-15",
    network: "Cashless via reimbursement",
    contact: "+91-22-6234-6234",
  },
];

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise);
}

function daysUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function InsurancePage() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    provider: "",
    policyNumber: "",
    planName: "",
    type: "Health" as PolicyType,
    coverage: "",
    premium: "",
    startDate: "",
    renewalDate: "",
    network: "",
    contact: "",
  });

  const reset = () =>
    setForm({
      provider: "",
      policyNumber: "",
      planName: "",
      type: "Health",
      coverage: "",
      premium: "",
      startDate: "",
      renewalDate: "",
      network: "",
      contact: "",
    });

  const addPolicy = () => {
    if (!form.provider || !form.policyNumber || !form.planName) {
      toast({ title: "Missing details", description: "Provider, policy number and plan name are required.", variant: "destructive" });
      return;
    }
    const policy: Policy = {
      id: `p-${Date.now()}`,
      provider: form.provider,
      policyNumber: form.policyNumber,
      planName: form.planName,
      type: form.type,
      coverage: Number(form.coverage) || 0,
      premium: Number(form.premium) || 0,
      startDate: form.startDate,
      renewalDate: form.renewalDate,
      network: form.network || "—",
      contact: form.contact || "—",
    };
    setPolicies((prev) => [policy, ...prev]);
    setOpen(false);
    reset();
    toast({ title: "Policy added", description: `${policy.planName} is now in your wallet.` });
  };

  const removePolicy = (id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Policy removed" });
  };

  const totalCoverage = policies.reduce((s, p) => s + p.coverage, 0);
  const totalPremium = policies.reduce((s, p) => s + p.premium, 0);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            Insurance Policies
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Keep all your health, life, and critical illness covers in one place.
          </motion.p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Policy
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active policies</CardDescription>
            <CardTitle className="text-3xl">{policies.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">All currently in force</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total coverage</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalCoverage)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Across all plans</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Annual premium</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalPremium)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Combined yearly outflow</CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {policies.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No policies yet. Add your first policy to track coverage and renewals.
            </CardContent>
          </Card>
        )}
        {policies.map((p, i) => {
          const days = daysUntil(p.renewalDate);
          const renewSoon = days >= 0 && days <= 60;
          const expired = days < 0;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                          {p.planName}
                          <Badge variant="secondary">{p.type}</Badge>
                          {expired ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> Expired
                            </Badge>
                          ) : renewSoon ? (
                            <Badge className="gap-1 bg-amber-500 hover:bg-amber-500">
                              <CalendarClock className="h-3 w-3" /> Renew in {days}d
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Active
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" /> {p.provider}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> {p.policyNumber}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => toast({ title: "Downloading policy document" })}>
                        <Download className="h-4 w-4" /> Document
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => removePolicy(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Coverage</div>
                      <div className="font-semibold">{formatCurrency(p.coverage)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Premium / yr</div>
                      <div className="font-semibold">{formatCurrency(p.premium)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Renewal</div>
                      <div className="font-semibold">{p.renewalDate || "—"}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Helpline</div>
                      <div className="font-semibold truncate">{p.contact}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Network: {p.network}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Add a new policy
            </DialogTitle>
            <DialogDescription>Enter the policy details from your insurer card or document.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Plan name</Label>
              <Input value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} placeholder="Family Health Optima" />
            </div>
            <div>
              <Label className="text-xs">Provider</Label>
              <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Star Health" />
            </div>
            <div>
              <Label className="text-xs">Policy number</Label>
              <Input value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} placeholder="SH-2024-XXXXX" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as PolicyType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Life">Life</SelectItem>
                  <SelectItem value="Accident">Accident</SelectItem>
                  <SelectItem value="Critical Illness">Critical Illness</SelectItem>
                  <SelectItem value="Family Floater">Family Floater</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Coverage (₹)</Label>
              <Input type="number" value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} placeholder="1000000" />
            </div>
            <div>
              <Label className="text-xs">Annual premium (₹)</Label>
              <Input type="number" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} placeholder="18500" />
            </div>
            <div>
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Renewal date</Label>
              <Input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Network</Label>
              <Input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} placeholder="11,500+ hospitals" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Helpline</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="+91-..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addPolicy}>Save policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
