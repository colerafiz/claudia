import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, ExternalLink } from "lucide-react";
import { Input } from "./ui/input";

interface Issue {
  repository: string;
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  html_url: string;
}

export function Issues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      setLoading(true);
      setError(null);
      
      // Get all project directories
      const projects = await invoke<string[]>("list_projects");
      
      // Fetch issues for each project
      const allIssues: Issue[] = [];
      for (const project of projects) {
        try {
          // Use gh cli to get issues
          const result = await invoke<string>("run_gh_command", {
            args: ["issue", "list", "--json", "number,title,state,labels,url", "--repo", project]
          });
          
          const projectIssues = JSON.parse(result);
          allIssues.push(...projectIssues.map((issue: any) => ({
            ...issue,
            repository: project
          })));
        } catch (err) {
          // Skip repositories without issues or invalid GitHub remotes
          console.warn(`Failed to fetch issues for ${project}:`, err);
        }
      }
      
      setIssues(allIssues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = searchQuery === "" || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.repository.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = issue.state === activeTab;
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">GitHub Issues</h1>
        <Input
          type="search"
          placeholder="Search issues..."
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "open" | "closed")}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="open">
            Open ({issues.filter(i => i.state === "open").length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({issues.filter(i => i.state === "closed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-6">
          <div className="grid gap-4">
            {filteredIssues.map((issue) => (
              <Card key={`${issue.repository}-${issue.number}`} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm text-muted-foreground">{issue.repository}</h3>
                    <h2 className="font-semibold">#{issue.number} {issue.title}</h2>
                    {issue.labels.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {issue.labels.map((label) => (
                          <span key={label} className="px-2 py-1 text-xs rounded-full bg-primary/10">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <a 
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </Card>
            ))}
            {filteredIssues.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No {activeTab} issues found
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          <div className="grid gap-4">
            {filteredIssues.map((issue) => (
              <Card key={`${issue.repository}-${issue.number}`} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm text-muted-foreground">{issue.repository}</h3>
                    <h2 className="font-semibold">#{issue.number} {issue.title}</h2>
                    {issue.labels.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {issue.labels.map((label) => (
                          <span key={label} className="px-2 py-1 text-xs rounded-full bg-primary/10">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <a 
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </Card>
            ))}
            {filteredIssues.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No {activeTab} issues found
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}