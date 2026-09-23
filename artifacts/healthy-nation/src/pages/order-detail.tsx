import { useParams, Link } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/format";
import { ChevronLeft, MapPin, Package, Check, Phone, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function OrderDetailPage() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id, queryKey: ["order", id] } });

  if (isLoading) return <div className="h-[50vh] flex items-center justify-center animate-pulse">Loading order...</div>;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  const isDelivered = order.status === 'delivered';

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      <Link href="/orders">
        <Button variant="ghost" size="sm" className="mb-2 -ml-4 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Orders
        </Button>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order #{order.id}</h1>
          <p className="text-muted-foreground mt-1">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="text-left sm:text-right">
          <Badge variant="outline" className={`text-base py-1 px-4 ${isDelivered ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Tracker */}
      <Card className="border-none shadow-sm bg-muted/30 overflow-hidden">
        <CardContent className="p-8">
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute top-5 left-8 right-8 h-1 bg-border rounded-full -z-10">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000" 
                style={{ width: `${Math.max(0, Math.min(100, (order.currentStep / (Math.max(1, order.steps.length - 1))) * 100))}%` }} 
              />
            </div>
            
            <div className="flex justify-between relative z-10">
              {order.steps.map((step, i) => {
                const isDone = step.status === 'done';
                const isCurrent = step.status === 'current';
                return (
                  <div key={i} className="flex flex-col items-center text-center w-24">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-background shadow-sm mb-3 transition-colors ${
                      isDone ? 'bg-primary text-primary-foreground' : 
                      isCurrent ? 'bg-background border-primary text-primary animate-pulse' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isDone ? <Check className="h-5 w-5" /> : <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-primary' : 'bg-muted-foreground'}`} />}
                    </div>
                    <div className={`text-xs font-bold leading-tight ${isCurrent ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </div>
                    {step.timestamp && (
                      <div className="text-[10px] text-muted-foreground mt-1">{formatTime(step.timestamp)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!isDelivered && (
            <div className="mt-8 text-center bg-background rounded-xl p-4 border shadow-sm">
              <span className="text-muted-foreground text-sm">Estimated Delivery: </span>
              <span className="font-bold text-lg ml-2">{formatTime(order.estimatedDeliveryAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" /> Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {order.items.map((item, i) => (
                  <li key={i} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {item.quantity}x
                      </div>
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.strength}</div>
                      </div>
                    </div>
                    <div className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="bg-muted/20 p-4 flex justify-between border-t text-sm font-medium">
              <span className="text-muted-foreground">Sold by {order.pharmacyName}</span>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5" /> Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg pt-1">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="text-xs text-center text-muted-foreground uppercase tracking-wider pt-2">
                Paid via {order.paymentMethod}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold mb-1"><MapPin className="h-4 w-4 text-primary" /> Delivery Address</div>
                <div className="text-sm text-muted-foreground pl-6 leading-relaxed">{order.deliveryAddress}</div>
              </div>
              
              {order.driverName && (
                <div className="pt-4 border-t">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-bold">Delivery Partner</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{order.driverName}</div>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full"><Phone className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
