import {
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  FileText,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

export function HelpPage() {
  const categories = [
    {
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics of RetailLocator",
      articles: 12,
    },
    {
      icon: FileText,
      title: "Item Management",
      description: "How to add and manage items",
      articles: 8,
    },
    {
      icon: FileText,
      title: "Data Import/Export",
      description: "CSV uploads and API integration",
      articles: 6,
    },
    {
      icon: FileText,
      title: "User & Permissions",
      description: "Managing users and roles",
      articles: 5,
    },
  ];

  const faqs = [
    {
      question: "How do I add a new item location?",
      answer:
        "Navigate to the Item Management page and click the 'Add New Item' button. Fill in the required fields including SKU, item name, store, aisle, shelf, and quantity, then click Save.",
    },
    {
      question: "What CSV format is required for importing data?",
      answer:
        "Your CSV file should include columns for SKU, Item Name, Store, Aisle, Shelf, and Quantity. The first row should contain these exact header names. Make sure the file is UTF-8 encoded.",
    },
    {
      question: "How do I assign roles to users?",
      answer:
        "Go to the User & Role Management page under Settings. Click 'Add User', enter their details, and select a role from the dropdown. You can also edit existing users to change their roles.",
    },
    {
      question: "Can I export my data?",
      answer:
        "Yes! Navigate to Settings > Data Management and click 'Export All Data' to download your complete item location database as a CSV file.",
    },
    {
      question: "How do I search for items across all stores?",
      answer:
        "Use the search bar on the Dashboard page. You can search by SKU, item name, or aisle. Use the store filter to narrow results to specific locations.",
    },
    {
      question: "What browsers are supported?",
      answer:
        "RetailLocator works best on modern browsers including Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated to the latest version.",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Help Center</h1>
        <p className="text-muted-foreground mt-1">
          Find answers, guides, and support resources
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help articles, guides, or FAQs..."
              className="pl-12 h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Categories */}
      <div>
        <h2 className="mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {category.articles} articles
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Still Need Help?</CardTitle>
          <CardDescription>Get in touch with our support team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-6 border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="mb-2">Live Chat</h3>
              <p className="text-muted-foreground mb-4">
                Chat with our support team in real-time
              </p>
              <Button>Start Chat</Button>
            </div>

            <div className="flex flex-col items-center text-center p-6 border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="mb-2">Email Support</h3>
              <p className="text-muted-foreground mb-4">
                Get help via email within 24 hours
              </p>
              <Button variant="outline">Send Email</Button>
            </div>

            <div className="flex flex-col items-center text-center p-6 border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="mb-2">Phone Support</h3>
              <p className="text-muted-foreground mb-4">
                Call us Monday-Friday, 9AM-5PM EST
              </p>
              <Button variant="outline">1-800-RETAIL</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto py-4">
              <FileText className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p>Documentation</p>
                <p className="text-muted-foreground">
                  Detailed technical guides
                </p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4">
              <Book className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p>Video Tutorials</p>
                <p className="text-muted-foreground">
                  Step-by-step video guides
                </p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
