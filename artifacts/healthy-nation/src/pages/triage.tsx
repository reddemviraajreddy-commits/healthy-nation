import { useState, useRef, useEffect } from "react";
import { 
  useRunTriage, 
  useTriageChat, 
  useListTriageSessions,
  TriageResult,
  ChatReply
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Stethoscope, MessageSquare, Send, AlertTriangle, ArrowRight, ShieldAlert, Thermometer, Clock, Activity, ShieldCheck, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatRelative } from "@/lib/format";

export default function TriagePage() {
  const [step, setStep] = useState<"history" | "intake" | "chat" | "result">("history");
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useListTriageSessions();

  return (
    <div className="space-y-8 pb-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Symptom Checker</h1>
        <p className="text-muted-foreground mt-1">Get an instant assessment and recommendations.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <Card className="bg-primary/5 border-primary/20 shadow-sm">
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-xl font-bold mb-2">Check new symptoms</h2>
                  <p className="text-muted-foreground mb-4">Our AI will ask you a few questions to understand how you're feeling and recommend the right level of care.</p>
                  <Button onClick={() => setStep("intake")} size="lg">Start Assessment</Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-lg font-semibold mb-4">Previous Assessments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessionsLoading ? (
                  Array(2).fill(0).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)
                ) : sessions && sessions.length > 0 ? (
                  sessions.map(session => (
                    <Card key={session.id} className="hover-elevate">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{session.primarySymptom}</h4>
                          <Badge variant={
                            session.triageLevel === 'emergency' ? 'destructive' : 
                            session.triageLevel === 'urgent' ? 'secondary' : 'outline'
                          } className={session.triageLevel === 'urgent' ? 'bg-chart-3 text-white' : ''}>
                            {session.triageLevel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{session.summary}</p>
                        <div className="text-xs text-muted-foreground/70 font-mono">
                          {formatRelative(session.createdAt)}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 border border-dashed rounded-xl text-muted-foreground">
                    No previous assessments.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {step === "intake" && (
          <motion.div key="intake" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <IntakeForm onComplete={(res, cid) => { setTriageResult(res); setConversationId(cid); setStep("result"); }} onNeedChat={(cid) => { setConversationId(cid); setStep("chat"); }} onBack={() => setStep("history")} />
          </motion.div>
        )}

        {step === "chat" && (
          <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ChatInterface conversationId={conversationId} onComplete={(res) => { setTriageResult(res); setStep("result"); }} />
          </motion.div>
        )}

        {step === "result" && triageResult && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <ResultPanel result={triageResult} onReset={() => { setTriageResult(null); setConversationId(null); setStep("history"); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IntakeForm({ onComplete, onNeedChat, onBack }: { onComplete: (res: TriageResult, cid: string) => void, onNeedChat: (cid: string) => void, onBack: () => void }) {
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState([5]);
  const [duration, setDuration] = useState("1");
  const { toast } = useToast();
  
  const runTriage = useRunTriage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      toast({ title: "Please describe your symptoms", variant: "destructive" });
      return;
    }

    try {
      const res = await runTriage.mutateAsync({
        data: {
          symptoms: symptoms.split(",").map(s => s.trim()).filter(Boolean),
          severity: severity[0],
          durationDays: parseInt(duration, 10) || 1
        }
      });
      
      // If the API returns a result directly, go to result. Otherwise if it returns a chat prompt (mocked as null result), go to chat.
      // Our API mock usually returns a full result immediately for simplicity, but we can pretend.
      if (res.triageLevel) {
        onComplete(res, "conv-" + Date.now());
      } else {
        onNeedChat("conv-" + Date.now());
      }
    } catch (err) {
      toast({ title: "Assessment failed", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Initial Intake</CardTitle>
        <CardDescription>Tell us what's bothering you.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>What are your main symptoms?</Label>
            <Textarea 
              placeholder="e.g. headache, fever, sore throat (separate by commas)" 
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>How severe is the discomfort? (1-10)</Label>
              <span className="font-bold text-primary">{severity[0]}</span>
            </div>
            <Slider 
              value={severity} 
              onValueChange={setSeverity} 
              max={10} 
              min={1} 
              step={1} 
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>How many days have you had these symptoms?</Label>
            <Input 
              type="number" 
              min="1" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)} 
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>Cancel</Button>
          <Button type="submit" disabled={runTriage.isPending}>
            {runTriage.isPending ? "Analyzing..." : "Continue"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ChatInterface({ conversationId, onComplete }: { conversationId: string | null, onComplete: (res: any) => void }) {
  const [messages, setMessages] = useState<{role: "user" | "ai", content: string}[]>([
    { role: "ai", content: "I need a bit more information. Are you experiencing any shortness of breath or chest pain?" }
  ]);
  const [input, setInput] = useState("");
  const chatMutation = useTriageChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await chatMutation.mutateAsync({
        data: { message: text, conversationId }
      });
      
      // Mock condition: if the user types "done", we return a result
      if (text.toLowerCase().includes("done") || newMessages.length > 5) {
        // Mock result for demonstration
        onComplete({
          triageLevel: "routine",
          summary: "Based on our chat, your symptoms appear mild.",
          possibleConditions: [{ name: "Common Cold", probability: 80, dangerous: false, description: "Viral infection." }],
          recommendations: ["Rest", "Drink fluids"],
          recommendedSpecialty: "General Physician",
          timeFrame: "Next few days",
          riskScore: 20
        });
        return;
      }
      
      setMessages(prev => [...prev, { role: "ai", content: res.reply }]);
    } catch(err) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error processing that." }]);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> AI Assistant
        </CardTitle>
      </CardHeader>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl p-3 ${
              m.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                : 'bg-muted rounded-tl-sm'
            }`}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center">
              <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t shrink-0">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 hide-scrollbar">
          {["No", "Yes, a little", "Yes, severe"].map(qr => (
            <Badge 
              key={qr} 
              variant="secondary" 
              className="cursor-pointer hover:bg-secondary/80 whitespace-nowrap"
              onClick={() => handleSend(qr)}
            >
              {qr}
            </Badge>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your response..." />
          <Button type="submit" size="icon" disabled={chatMutation.isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

function ResultPanel({ result, onReset }: { result: TriageResult, onReset: () => void }) {
  const isEmergency = result.triageLevel === 'emergency';
  const isUrgent = result.triageLevel === 'urgent';
  
  return (
    <div className="space-y-6">
      <Card className={`overflow-hidden border-t-8 ${
        isEmergency ? 'border-t-destructive' : 
        isUrgent ? 'border-t-chart-3' : 'border-t-chart-2'
      }`}>
        <CardHeader className="bg-muted/30">
          <div className="flex justify-between items-start">
            <div>
              <CardDescription className="uppercase tracking-wider font-semibold mb-1">Assessment Complete</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                {isEmergency && <ShieldAlert className="h-6 w-6 text-destructive" />}
                {isUrgent && <AlertTriangle className="h-6 w-6 text-chart-3" />}
                {!isEmergency && !isUrgent && <ShieldCheck className="h-6 w-6 text-chart-2" />}
                Triage Level: <span className="capitalize">{result.triageLevel}</span>
              </CardTitle>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground mb-1">Risk Score</div>
              <div className={`text-2xl font-black ${
                result.riskScore > 75 ? 'text-destructive' : 
                result.riskScore > 40 ? 'text-chart-3' : 'text-chart-2'
              }`}>{result.riskScore}/100</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div>
            <h3 className="font-semibold text-lg mb-2">Summary</h3>
            <p className="text-foreground/90 leading-relaxed">{result.summary}</p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Possible Conditions</h3>
            <div className="space-y-4">
              {result.possibleConditions.map((cond, i) => (
                <div key={i} className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden">
                  {cond.dangerous && <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Dangerous</div>}
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-base">{cond.name}</h4>
                    <span className="font-mono font-medium text-sm">{cond.probability}% Match</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${cond.probability}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">{cond.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <Check className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted rounded-xl p-5 border flex flex-col justify-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Recommended Action</h4>
              <div className="font-bold text-lg mb-1">{result.timeFrame}</div>
              <div className="text-sm mb-4">Consult a <span className="font-semibold">{result.recommendedSpecialty}</span></div>
              <Link href={`/doctors?specialty=${encodeURIComponent(result.recommendedSpecialty)}`}>
                <Button className="w-full">Find a Doctor</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center">
        <Button variant="ghost" onClick={onReset}>Start a new assessment</Button>
      </div>
    </div>
  );
}