import {
  Search,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { useNavigate } from "react-router-dom";

export function HomePage() {
  const features = [
    {
      icon: Search,
      title: "Smart Item Lookup",
      description:
        "Instantly find any product across all store locations with powerful search and filtering.",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description:
        "Track inventory levels and get insights on stock movement across your retail network.",
    },
    {
      icon: RefreshCw,
      title: "Automated Sync",
      description:
        "Keep your data up-to-date with CSV imports and API integrations.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Manage user roles and permissions for your entire team.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Built for speed with optimized search and real-time updates.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with role-based access control.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Operations Manager",
      company: "RetailCorp",
      content:
        "RetailLocator has transformed how we manage inventory across our 50+ stores. It's a game-changer!",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Inventory Director",
      company: "ShopMart",
      content:
        "The CSV import feature saves us hours every week. Highly recommend for any retail operation.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Store Manager",
      company: "QuickMart",
      content:
        "Simple, intuitive, and powerful. Our team adapted to it within a day.",
      rating: 5,
    },
  ];

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4">Trusted by 1,000+ retailers</Badge>
            <h1 className="mb-6">
              Manage Your Retail Inventory
              <br />
              Across All Locations
            </h1>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              RetailLocator helps you track, manage, and optimize product
              locations across your entire retail network. Say goodbye to lost
              items and inefficient searches.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/SignUp")}>
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/login")}
              >
                Watch Demo
              </Button>
            </div>
            <p className="text-muted-foreground mt-4">
              No credit card required • 14-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4">Everything you need to manage inventory</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for modern retail operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-6">Why retailers choose RetailLocator</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3>Save Time & Reduce Errors</h3>
                    <p className="text-muted-foreground">
                      Eliminate manual tracking and reduce item location errors
                      by up to 90%
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3>Scale Effortlessly</h3>
                    <p className="text-muted-foreground">
                      From 1 to 1,000 stores, our platform grows with your
                      business
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3>Easy Integration</h3>
                    <p className="text-muted-foreground">
                      Connect with your existing systems via CSV or API in
                      minutes
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card border rounded-2xl p-8 shadow-lg">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4">Loved by retail professionals</h2>
            <p className="text-muted-foreground">
              See what our customers have to say
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <CardDescription className="italic">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-primary-foreground mb-6">
            Ready to transform your inventory management?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of retailers who trust RetailLocator to manage their
            inventory
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/SignUp")}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/contact")}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
    </div>
  );
}
