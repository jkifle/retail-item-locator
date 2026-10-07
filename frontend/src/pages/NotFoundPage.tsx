import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
          <FileQuestion className="w-10 h-10 text-muted-foreground" />
        </div>

        <h1 className="mb-4">Page Not Found</h1>

        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist. It might have been
          moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("dashboard")}>
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="mt-12 p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground mb-2">
            Need help finding something?
          </p>
          <Button
            variant="link"
            onClick={() => navigate("help")}
            className="p-0 h-auto"
          >
            Visit our Help Center →
          </Button>
        </div>
      </div>
    </div>
  );
}
