import { useState } from "react";
import { useListMedicines, useListPharmacies, useCreateOrder, Medicine, OrderItemInput } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import {
  Search, ShoppingCart, Pill, Building2, MapPin, Plus, Minus, Trash2, ArrowRight,
  Thermometer, Wind, Sparkles, Leaf, Stethoscope, Bandage, Activity, Droplet,
  Heart, Bone, Brain, Tablets, Syringe, FlaskConical
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface CartItem extends Medicine {
  cartQuantity: number;
}

const CATEGORY_VISUAL: Record<string, { icon: any; color: string; bg: string }> = {
  "Pain & Fever": { icon: Thermometer, color: "text-rose-600", bg: "bg-rose-100" },
  "Pain Relief": { icon: Thermometer, color: "text-rose-600", bg: "bg-rose-100" },
  "Allergy": { icon: Sparkles, color: "text-amber-600", bg: "bg-amber-100" },
  "Respiratory": { icon: Wind, color: "text-sky-600", bg: "bg-sky-100" },
  "Vitamins": { icon: Leaf, color: "text-emerald-600", bg: "bg-emerald-100" },
  "Digestive": { icon: Droplet, color: "text-orange-600", bg: "bg-orange-100" },
  "Antibiotic": { icon: Stethoscope, color: "text-violet-600", bg: "bg-violet-100" },
  "Antibiotics": { icon: Stethoscope, color: "text-violet-600", bg: "bg-violet-100" },
  "Diabetes": { icon: Activity, color: "text-indigo-600", bg: "bg-indigo-100" },
  "Chronic Care": { icon: Heart, color: "text-pink-600", bg: "bg-pink-100" },
  "First Aid": { icon: Bandage, color: "text-red-600", bg: "bg-red-100" },
  "Cardiac": { icon: Heart, color: "text-pink-600", bg: "bg-pink-100" },
  "Orthopedic": { icon: Bone, color: "text-stone-600", bg: "bg-stone-100" },
  "Neuro": { icon: Brain, color: "text-fuchsia-600", bg: "bg-fuchsia-100" },
};

const FORM_ICON: Record<string, any> = {
  Tablet: Tablets,
  Capsule: Pill,
  Inhaler: Wind,
  Syrup: FlaskConical,
  Injection: Syringe,
  Drops: Droplet,
};

function visualFor(med: { category?: string | null; form?: string | null }) {
  const cat = med.category || "";
  const v = CATEGORY_VISUAL[cat] || { icon: FORM_ICON[med.form || ""] || Pill, color: "text-primary", bg: "bg-primary/10" };
  return v;
}

const PHOTO_BASE = `${import.meta.env.BASE_URL}medicines/`;

const NAME_PHOTO: Record<string, string> = {
  "Paracetamol": `${PHOTO_BASE}paracetamol.png`,
  "Ibuprofen": `${PHOTO_BASE}ibuprofen.png`,
  "Cetirizine": `${PHOTO_BASE}cetirizine.png`,
  "Loratadine": `${PHOTO_BASE}loratadine.png`,
  "Albuterol Inhaler": `${PHOTO_BASE}albuterol-inhaler.png`,
  "Vitamin D3": `${PHOTO_BASE}vitamin-d3.png`,
  "Iron + Folic Acid": `${PHOTO_BASE}iron-folic.png`,
  "Omeprazole": `${PHOTO_BASE}omeprazole.png`,
  "Amoxicillin": `${PHOTO_BASE}amoxicillin.png`,
  "Metformin": `${PHOTO_BASE}metformin.png`,
  "Multivitamin": `${PHOTO_BASE}vitamin-d3.png`,
  "ORS Sachets": `${PHOTO_BASE}iron-folic.png`,
};

const CATEGORY_PHOTO: Record<string, string> = {
  "Pain & Fever": `${PHOTO_BASE}paracetamol.png`,
  "Allergy": `${PHOTO_BASE}cetirizine.png`,
  "Respiratory": `${PHOTO_BASE}albuterol-inhaler.png`,
  "Vitamins": `${PHOTO_BASE}vitamin-d3.png`,
  "Digestive": `${PHOTO_BASE}omeprazole.png`,
  "Antibiotic": `${PHOTO_BASE}amoxicillin.png`,
  "Diabetes": `${PHOTO_BASE}metformin.png`,
  "Hydration": `${PHOTO_BASE}iron-folic.png`,
};

const FORM_PHOTO: Record<string, string> = {
  Tablet: `${PHOTO_BASE}paracetamol.png`,
  Capsule: `${PHOTO_BASE}amoxicillin.png`,
  Inhaler: `${PHOTO_BASE}albuterol-inhaler.png`,
  Powder: `${PHOTO_BASE}iron-folic.png`,
};

function photoFor(med: { name?: string; imageUrl?: string | null; category?: string | null; form?: string | null }) {
  if (med.imageUrl) return med.imageUrl;
  if (med.name && NAME_PHOTO[med.name]) return NAME_PHOTO[med.name];
  if (med.category && CATEGORY_PHOTO[med.category]) return CATEGORY_PHOTO[med.category];
  if (med.form && FORM_PHOTO[med.form]) return FORM_PHOTO[med.form];
  return `${PHOTO_BASE}paracetamol.png`;
}

const CATEGORIES = ["All", "Pain & Fever", "Antibiotic", "Vitamins", "Allergy", "Respiratory", "Digestive", "Diabetes", "Hydration"];

export default function PharmacyPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const { toast } = useToast();

  const { data: medicines, isLoading } = useListMedicines({
    q: q || undefined,
    category: category !== "All" ? category : undefined
  });
  
  const { data: pharmacies } = useListPharmacies();
  const createOrder = useCreateOrder();

  const addToCart = (med: Medicine) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === med.id);
      if (existing) {
        return prev.map(item => item.id === med.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      toast({ title: "Added to cart", description: `${med.name} added to your basket.` });
      return [...prev, { ...med, cartQuantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.cartQuantity + delta;
        return newQ > 0 ? { ...item, cartQuantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const [deliveryAddress, setAddress] = useState("Home - 123 Health St, Apt 4B");
  const [pharmacyId, setPharmacyId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<any>("card");

  const handleCheckout = async () => {
    if (!pharmacyId) {
      toast({ title: "Select a pharmacy", variant: "destructive" });
      return;
    }
    try {
      const items: OrderItemInput[] = cart.map(i => ({ medicineId: i.id, quantity: i.cartQuantity }));
      await createOrder.mutateAsync({
        data: {
          pharmacyId: parseInt(pharmacyId, 10),
          items,
          deliveryAddress,
          paymentMethod
        }
      });
      setCart([]);
      setIsCheckout(false);
      toast({ title: "Order placed successfully!" });
      // Redirect to orders would be nice, but simple state clear works too
      window.location.href = "/orders"; 
    } catch (err) {
      toast({ title: "Checkout failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy</h1>
          <p className="text-muted-foreground mt-1">Order medicines for delivery.</p>
        </div>
        
        <Sheet open={isCheckout} onOpenChange={setIsCheckout}>
          <SheetTrigger asChild>
            <Button className="relative gap-2 px-6 h-12 rounded-full shadow-md hover-elevate">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-bold">Cart</span>
              {cartCount > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold border-2 border-background">
                  {cartCount}
                </div>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
            <SheetHeader className="p-6 border-b shrink-0">
              <SheetTitle>Your Cart</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map(item => {
                      const v = visualFor(item);
                      const VIcon = v.icon;
                      return (
                      <div key={item.id} className="flex gap-4 p-3 border rounded-xl items-center">
                        <div className="w-16 h-16 bg-white border rounded-lg overflow-hidden flex items-center justify-center p-1">
                          <img src={photoFor(item)} alt={item.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm leading-tight">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.strength} • {item.form}</div>
                          <div className="font-bold text-primary mt-1">{formatCurrency(item.price)}</div>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                          <span className="text-sm font-bold w-4 text-center">{item.cartQuantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      );
                    })}
                  </div>
                  
                  <div className="space-y-4 pt-6 border-t">
                    <h3 className="font-bold text-lg">Checkout Details</h3>
                    <div className="space-y-2">
                      <Label>Select Pharmacy</Label>
                      <Select value={pharmacyId} onValueChange={setPharmacyId}>
                        <SelectTrigger><SelectValue placeholder="Choose a nearby pharmacy" /></SelectTrigger>
                        <SelectContent>
                          {pharmacies?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              <div className="flex justify-between items-center w-full pr-4">
                                <span>{p.name}</span>
                                <span className="text-xs text-muted-foreground">{p.distanceKm}km</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Delivery Address</Label>
                      <Input value={deliveryAddress} onChange={e => setAddress(e.target.value)} />
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label>Payment Method</Label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-2">
                        <Label htmlFor="pm-card" className="flex items-center justify-center p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary hover:bg-muted">
                          <RadioGroupItem value="card" id="pm-card" className="sr-only" />
                          <span className="font-medium text-sm">Card/UPI</span>
                        </Label>
                        <Label htmlFor="pm-cod" className="flex items-center justify-center p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary hover:bg-muted">
                          <RadioGroupItem value="cod" id="pm-cod" className="sr-only" />
                          <span className="font-medium text-sm">Cash on Delivery</span>
                        </Label>
                      </RadioGroup>
                    </div>
                  </div>
                </>
              )}
            </div>
            {cart.length > 0 && (
              <SheetFooter className="p-6 border-t bg-background shrink-0 flex flex-col gap-4">
                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Delivery</span><span>{formatCurrency(5000)}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span><span>{formatCurrency(cartTotal + 5000)}</span></div>
                </div>
                <Button className="w-full h-12 text-lg" onClick={handleCheckout} disabled={createOrder.isPending}>
                  {createOrder.isPending ? "Placing Order..." : "Place Order"}
                </Button>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search medicines..." 
            className="pl-9 h-12 rounded-xl bg-card border-none shadow-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {CATEGORIES.map(c => (
          <Badge 
            key={c}
            variant={category === c ? "default" : "outline"} 
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm rounded-full ${category !== c && "bg-card"}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(8).fill(0).map((_, i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />)
        ) : medicines?.length === 0 ? (
          <div className="col-span-full text-center py-20 text-muted-foreground">No medicines found.</div>
        ) : (
          medicines?.map((med, i) => {
            const v = visualFor(med);
            const VIcon = v.icon;
            return (
            <motion.div key={med.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full flex flex-col hover-elevate transition-all border-none shadow-sm bg-card overflow-hidden">
                <div className="relative h-40 bg-white overflow-hidden flex items-center justify-center p-3">
                  <img
                    src={photoFor(med)}
                    alt={med.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                  {med.requiresPrescription && (
                    <Badge variant="destructive" className="absolute top-2 left-2 text-[10px] px-1.5 py-0 z-10">Rx Req</Badge>
                  )}
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{med.category}</div>
                  <h3 className="font-bold text-foreground leading-tight line-clamp-2 flex-1">{med.name}</h3>
                  <div className="text-sm text-muted-foreground mt-1 mb-3">{med.strength} • {med.form}</div>
                  
                  <div className="flex items-end justify-between mt-auto">
                    <div>
                      <div className="text-xs text-muted-foreground line-through opacity-70">{formatCurrency(med.mrp)}</div>
                      <div className="font-black text-lg text-primary">{formatCurrency(med.price)}</div>
                    </div>
                    <Button 
                      size="sm" 
                      className="rounded-full px-4 h-9 shadow-sm"
                      onClick={() => addToCart(med)}
                      disabled={!med.inStock}
                    >
                      {med.inStock ? "Add" : "Out"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
