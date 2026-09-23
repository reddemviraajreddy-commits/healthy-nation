import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetDoctor, 
  useGetDoctorAvailability, 
  useCreateAppointment,
  VisitType 
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Star, MapPin, Video, Clock, CheckCircle, Languages, GraduationCap, Building2, ChevronLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function DoctorProfilePage() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: doc, isLoading: docLoading } = useGetDoctor(id, { query: { enabled: !!id, queryKey: ["doctor", id] } });
  const { data: availability } = useGetDoctorAvailability(id, { days: 7 }, { query: { enabled: !!id, queryKey: ["availability", id] } });
  
  const createAppointment = useCreateAppointment();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [visitType, setVisitType] = useState<VisitType>("in_person");
  const [reason, setReason] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize selected date
  if (availability && availability.length > 0 && !selectedDate) {
    setSelectedDate(availability[0].date);
  }

  const activeDaySlots = availability?.find(d => d.date === selectedDate)?.slots || [];

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !reason) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      await createAppointment.mutateAsync({
        data: {
          doctorId: id,
          scheduledAt,
          visitType,
          reason
        }
      });
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast({ title: "Booking failed", variant: "destructive" });
    }
  };

  if (docLoading) return <div className="h-[50vh] flex items-center justify-center animate-pulse text-muted-foreground">Loading doctor profile...</div>;
  if (!doc) return <div className="text-center py-20 text-xl font-medium">Doctor not found</div>;

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <CheckCircle className="h-12 w-12" />
        </motion.div>
        <h1 className="text-3xl font-bold">Appointment Confirmed!</h1>
        <p className="text-muted-foreground text-lg">Your appointment with Dr. {doc.name} has been scheduled for {formatDate(selectedDate)} at {selectedTime}.</p>
        <div className="pt-8 flex gap-4 justify-center">
          <Link href="/appointments"><Button>View My Appointments</Button></Link>
          <Link href="/"><Button variant="outline">Return Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <Link href="/doctors">
        <Button variant="ghost" size="sm" className="mb-4 -ml-4 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Search
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg shrink-0">
              <AvatarImage src={doc.photoUrl} />
              <AvatarFallback>{doc.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">Dr. {doc.name}</h1>
                {doc.verified && <CheckCircle className="h-5 w-5 text-primary" />}
              </div>
              <p className="text-xl text-primary font-medium">{doc.specialty}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-chart-3 text-chart-3" />
                  <span className="font-medium text-foreground">{doc.rating}</span>
                  <span>({doc.ratingCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>{doc.experienceYears} Years Exp.</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="about" className="mt-8">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="about" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">About</TabsTrigger>
              <TabsTrigger value="location" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">Location & Fees</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="pt-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Biography</h3>
                <p className="text-muted-foreground leading-relaxed">{doc.bio}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Languages Spoken</h3>
                <div className="flex gap-2">
                  {doc.languages.map(l => (
                    <Badge key={l} variant="secondary" className="px-3 py-1"><Languages className="h-3 w-3 mr-2 opacity-50" />{l}</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="location" className="pt-6 space-y-6">
              <div className="flex items-start gap-4 p-4 border rounded-xl bg-muted/20">
                <Building2 className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h4 className="font-bold text-lg">{doc.clinicName}</h4>
                  <p className="text-muted-foreground">{doc.city}</p>
                  <Button variant="link" className="p-0 h-auto mt-2 text-primary">Get Directions <ArrowRight className="h-3 w-3 ml-1" /></Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> In-person Visit</div>
                    <div className="font-bold">{formatCurrency(doc.feeInPerson)}</div>
                  </CardContent>
                </Card>
                {doc.supportsTelemedicine && (
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2"><Video className="h-4 w-4" /> Video Consult</div>
                      <div className="font-bold">{formatCurrency(doc.feeTelemedicine)}</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Booking Widget */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-primary/20 shadow-md">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-bold text-xl mb-4">Book Appointment</h3>
              
              <div className="space-y-3">
                <Label>Visit Type</Label>
                <RadioGroup value={visitType} onValueChange={(v: any) => setVisitType(v)} className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <RadioGroupItem value="in_person" id="in_person" className="peer sr-only" />
                    <Label htmlFor="in_person" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <MapPin className="mb-2 h-5 w-5" />
                      <span className="font-medium text-sm">Clinic</span>
                    </Label>
                  </div>
                  {doc.supportsTelemedicine ? (
                    <div className="relative">
                      <RadioGroupItem value="telemedicine" id="telemedicine" className="peer sr-only" />
                      <Label htmlFor="telemedicine" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Video className="mb-2 h-5 w-5" />
                        <span className="font-medium text-sm">Video</span>
                      </Label>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-muted/50 p-4 opacity-50 cursor-not-allowed">
                      <Video className="mb-2 h-5 w-5" />
                      <span className="text-sm">Video (N/A)</span>
                    </div>
                  )}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Date</Label>
                <ScrollArea className="w-full whitespace-nowrap pb-2">
                  <div className="flex gap-2">
                    {availability?.map(day => {
                      const d = new Date(day.date);
                      const isSelected = selectedDate === day.date;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => { setSelectedDate(day.date); setSelectedTime(""); }}
                          className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-xl border transition-all ${
                            isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                          }`}
                        >
                          <span className="text-xs font-medium uppercase opacity-80">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className="text-lg font-bold">{d.getDate()}</span>
                          <span className="text-[10px] mt-1 opacity-80">{day.slots.filter(s => s.available).length} slots</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3">
                <Label>Time</Label>
                <div className="grid grid-cols-3 gap-2">
                  {activeDaySlots.length > 0 ? activeDaySlots.map(slot => (
                    <Button
                      key={slot.time}
                      type="button"
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      className={`text-xs h-9 ${!slot.available && "opacity-30 cursor-not-allowed"}`}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                    </Button>
                  )) : (
                    <div className="col-span-3 text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">No slots available</div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Reason for visit</Label>
                <Input 
                  placeholder="E.g., Follow up, routine checkup..." 
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                />
              </div>

              <div className="pt-4 border-t border-border mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-muted-foreground">Total Fee</span>
                  <span className="text-2xl font-bold">{formatCurrency(visitType === 'in_person' ? doc.feeInPerson : doc.feeTelemedicine)}</span>
                </div>
                <Button 
                  className="w-full h-12 text-lg font-bold" 
                  disabled={!selectedTime || !reason || createAppointment.isPending}
                  onClick={handleBook}
                >
                  {createAppointment.isPending ? "Confirming..." : "Confirm Booking"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
