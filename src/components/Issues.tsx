import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

interface Issue {
  repo: string;
  number: number;
  title: string;
  url: string;
  state: "open" | "closed";
  labels: string[];
}

interface IssuesProps {
  onBack: () => void;
}

export function Issues({ onBack }: IssuesProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This will be implemented in the backend
      const issuesList = await api.listIssues();
      setIssues(issuesList);
    } catch (err) {
      console.error("Failed to load issues:", err);
      setError("Failed to load issues. Please ensure you have gh CLI installed and configured.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIssue = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header with back button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          ← Back to Home
        </Button>
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse GitHub issues across all repositories
          </p>
        </div>
      </motion.div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive max-w-2xl"
        >
          {error}
        </motion.div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Issues list */}
      {!loading && !error && (
        <div className="grid gap-4">
          {issues.length > 0 ? (
            issues.map((issue) => (
              <Card
                key={`${issue.repo}-${issue.number}`}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleOpenIssue(issue.url)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {issue.repo} #{issue.number}
                    </div>
                    <div className="font-medium">
                      {issue.title}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        issue.state === "open" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {issue.state}
                      </span>
                      {issue.labels.map((label) => (
                        <span key={label} className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No issues found
            </div>
          )}
        </div>
      )}
    </div>
  );
}