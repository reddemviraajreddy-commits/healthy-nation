import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListDoctors, useListSpecialties, VisitType } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Search, Star, MapPin, Video, User, CheckCircle, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function DoctorsPage() {
  const [searchParams] = useLocation();
  const initialSpecialty = new URLSearchParams(window.location.search).get("specialty") || "";
  
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [visitType, setVisitType] = useState<VisitType | "">("");
  const [minRating, setMinRating] = useState([0]);
  
  const { data: specialties } = useListSpecialties();
  
  const { data: doctors, isLoading } = useListDoctors({
    q: q || undefined,
    specialty: specialty !== "all" ? specialty : undefined,
    visitType: visitType || undefined,
    minRating: minRating[0] > 0 ? minRating[0] : undefined
  });

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Find a Doctor</h1>
        <p className="text-muted-foreground mt-1">Book an appointment with top-rated specialists.</p>
      </div>

      <Card className="bg-card shadow-sm border-border">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search doctors, conditions, clinics..." 
                className="pl-9 h-12 text-base rounded-xl"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-xl">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties?.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12 rounded-xl px-4 gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {(visitType || minRating[0] > 0) && (
                    <span className="w-2 h-2 rounded-full bg-primary absolute top-2 right-2" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">Filter Results</h4>
                  <div className="space-y-2">
                    <Label>Visit Type</Label>
                    <Select value={visitType} onValueChange={(val: any) => setVisitType(val)}>
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                        <SelectItem value="telemedicine">Video Consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Minimum Rating</Label>
                      <span className="text-sm text-muted-foreground">{minRating[0]} Stars</span>
                    </div>
                    <Slider value={minRating} onValueChange={setMinRating} max={5} step={0.5} />
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => { setVisitType(""); setMinRating([0]); }}>Reset Filters</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <Badge 
              variant={specialty === "all" || !specialty ? "default" : "secondary"} 
              className="cursor-pointer whitespace-nowrap px-4 py-1.5 text-sm rounded-full"
              onClick={() => setSpecialty("all")}
            >
              All
            </Badge>
            {specialties?.slice(0, 8).map(s => (
              <Badge 
                key={s.name}
                variant={specialty === s.name ? "default" : "secondary"} 
                className="cursor-pointer whitespace-nowrap px-4 py-1.5 text-sm rounded-full hover:bg-secondary/80"
                onClick={() => setSpecialty(s.name)}
              >
                {s.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-sm font-medium text-muted-foreground">
        {isLoading ? "Searching..." : `${doctors?.length || 0} doctors found`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <div key={i} className="h-[280px] bg-muted animate-pulse rounded-xl" />)
        ) : doctors?.length === 0 ? (
          <div className="col-span-full text-center py-20 border border-dashed rounded-xl">
            <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No doctors found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        ) : (
          doctors?.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover-elevate transition-all h-full flex flex-col group cursor-pointer relative">
                <Link href={`/doctors/${doc.id}`} className="absolute inset-0 z-10" />
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                      <AvatarImage src={doc.photoUrl} alt={doc.name} />
                      <AvatarFallback>{doc.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">Dr. {doc.name}</h3>
                      <p className="text-primary text-sm font-medium">{doc.specialty}</p>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-chart-3 text-chart-3" />
                        <span className="font-medium text-foreground">{doc.rating}</span>
                        <span>({doc.ratingCount})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground flex-1">
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.clinicName}, {doc.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      <span>{doc.experienceYears} Years Exp.</span>
                    </div>
                    {doc.supportsTelemedicine && (
                      <div className="flex items-center gap-2 text-chart-2">
                        <Video className="h-4 w-4 shrink-0" />
                        <span>Video Consult available</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <div className="font-semibold">{formatCurrency(doc.feeInPerson)} <span className="text-xs text-muted-foreground font-normal">/ visit</span></div>
                    <Button size="sm" variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors z-20 pointer-events-none">
                      Book <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
