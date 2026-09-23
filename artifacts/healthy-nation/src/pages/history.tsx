import { useState } from "react";
import { 
  useListConditions, 
  useListMedications, 
  useGetProfile,
  useCreateCondition,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
  Condition,
  Medication
} from "@workspace/api-client-react";
import { formatDateTime, formatDate } from "@/lib/format";
import { Pill, Activity, User, FileText, Plus, CheckCircle2, Clock, Info, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("conditions");
  
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medical History</h1>
        <p className="text-muted-foreground mt-1">Your conditions, medications, and medical profile.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-muted/50 border border-border p-1 rounded-xl">
          <TabsTrigger value="conditions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Activity className="h-4 w-4 mr-2" /> Conditions</TabsTrigger>
          <TabsTrigger value="medications" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Pill className="h-4 w-4 mr-2" /> Medications</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><User className="h-4 w-4 mr-2" /> Medical ID</TabsTrigger>
        </TabsList>
        
        <TabsContent value="conditions" className="space-y-4">
          <ConditionsTab />
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          <MedicationsTab />
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConditionsTab() {
  const { data: conditions, isLoading } = useListConditions();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCondition = useCreateCondition();

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createCondition.mutateAsync({
        data: {
          name: formData.get("name") as string,
          status: formData.get("status") as any,
          severity: formData.get("severity") as any,
          diagnosisDate: new Date(formData.get("diagnosisDate") as string).toISOString(),
          notes: formData.get("notes") as string,
        }
      });
      toast({ title: "Condition added" });
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conditions"] });
    } catch(err) {
      toast({ title: "Failed to add", variant: "destructive" });
    }
  };

  const activeConditions = conditions?.filter(c => c.status === 'active') || [];
  const pastConditions = conditions?.filter(c => c.status !== 'active') || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Conditions</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Condition</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Condition</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required placeholder="e.g. Hypertension" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue="active">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select name="severity" defaultValue="moderate">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Diagnosis Date</Label><Input name="diagnosisDate" type="date" required /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full" disabled={createCondition.isPending}>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeConditions.map(c => (
          <ConditionCard key={c.id} condition={c} />
        ))}
        {activeConditions.length === 0 && (
          <div className="col-span-full text-center py-10 border border-dashed rounded-xl text-muted-foreground">
            No active conditions logged.
          </div>
        )}
      </div>

      {pastConditions.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-8 border-t pt-8">Past Conditions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            {pastConditions.map(c => (
              <ConditionCard key={c.id} condition={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ConditionCard({ condition }: { condition: Condition }) {
  return (
    <Card className="bg-card hover-elevate transition-all">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{condition.name}</h3>
          <Badge variant={condition.severity === 'severe' ? 'destructive' : condition.severity === 'moderate' ? 'default' : 'secondary'}>
            {condition.severity}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="h-3 w-3" /> Diagnosed {formatDate(condition.diagnosisDate)}
        </div>
        {condition.notes && (
          <div className="text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
            {condition.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MedicationsTab() {
  const { data: medications, isLoading } = useListMedications();
  
  const ongoing = medications?.filter(m => m.isOngoing) || [];
  const past = medications?.filter(m => !m.isOngoing) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Medications</h2>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Medication</Button>
      </div>
      
      <div className="space-y-4">
        {ongoing.map(m => (
          <Card key={m.id} className="overflow-hidden hover-elevate transition-all border-l-4 border-l-primary">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="p-5 md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-muted/20">
                  <h3 className="font-bold text-lg text-primary">{m.name}</h3>
                  <div className="font-medium text-foreground/80 mt-1">{m.dosage} • {m.frequency}</div>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <Info className="h-3 w-3" /> {m.indication}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col sm:flex-row gap-6 justify-between items-center">
                  <div className="space-y-2 w-full sm:w-auto">
                    <div className="text-sm text-muted-foreground font-medium">Adherence</div>
                    <div className="flex items-center gap-3">
                      <div className="w-full sm:w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.adherencePercent >= 80 ? 'bg-chart-2' : m.adherencePercent > 50 ? 'bg-chart-3' : 'bg-destructive'}`} style={{ width: `${m.adherencePercent}%` }} />
                      </div>
                      <span className="text-sm font-bold">{m.adherencePercent}%</span>
                    </div>
                  </div>
                  <div className="text-center sm:text-right w-full sm:w-auto flex justify-between sm:block">
                    <div className="text-sm text-muted-foreground mb-1">Refills</div>
                    <div className="font-semibold text-lg">{m.refillRemaining} left</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-8 border-t pt-8">Past Medications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            {past.map(m => (
              <Card key={m.id} className="bg-card">
                <CardContent className="p-5">
                  <h3 className="font-semibold">{m.name} <span className="text-muted-foreground font-normal text-sm ml-2">{m.dosage}</span></h3>
                  <div className="text-sm text-muted-foreground mt-1">Taken for {m.indication}</div>
                  <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Completed {m.endDate ? formatDate(m.endDate) : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProfileTab() {
  const { data: profile, isLoading } = useGetProfile();

  if (isLoading) return <div>Loading...</div>;
  if (!profile) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="border-t-4 border-t-destructive shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Emergency Medical ID
          </CardTitle>
          <CardDescription>This information is shared during an active SOS.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Blood Type</div>
              <div className="text-2xl font-bold text-foreground">{profile.bloodType}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Height / Weight</div>
              <div className="text-lg font-medium">{profile.height} cm / {profile.weight} kg</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Date of Birth</div>
              <div className="text-lg font-medium">{formatDate(profile.dob)}</div>
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t pt-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Allergies</div>
              <div className="flex flex-wrap gap-2">
                {profile.allergies.length > 0 ? profile.allergies.map(a => (
                  <Badge key={a} variant="destructive" className="bg-destructive/10 text-destructive border-none hover:bg-destructive/20">{a}</Badge>
                )) : <span className="text-sm">None recorded</span>}
              </div>
            </div>
            
            {profile.medicalNotes && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Medical Notes</div>
                <div className="text-sm bg-muted/30 p-3 rounded-lg border">
                  {profile.medicalNotes}
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 pt-2">
              {profile.emergencyOrganDonor && <Badge variant="outline" className="border-primary text-primary">Organ Donor</Badge>}
              {profile.dnr && <Badge variant="outline" className="border-destructive text-destructive">DNR Order on file</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
