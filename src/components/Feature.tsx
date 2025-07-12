import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FolderOpen, Play, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface FeatureProps {
  onBack: () => void;
}

export function Feature({ onBack }: FeatureProps) {
  const [directory, setDirectory] = useState("");
  const [ticket, setTicket] = useState("");
  const [agentCount, setAgentCount] = useState([3]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [runningAgents, setRunningAgents] = useState<Array<{
    agent_index: number;
    branch_name: string;
    run_id: number;
    pid?: number;
    terminal?: boolean;
  }>>([]);
  const [featureStatus, setFeatureStatus] = useState<{
    status: string;
    message: string;
  } | null>(null);
  const [expectedAgentCount, setExpectedAgentCount] = useState(0);

  const handleSelectDirectory = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory"
      });
      if (result && typeof result === "string") {
        setDirectory(result);
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const handleExecuteFeature = async () => {
    if (!directory || !ticket.trim()) {
      alert("Please select a directory and provide a feature description");
      return;
    }

    // Prevent multiple executions
    if (isExecuting) {
      return;
    }

    setIsExecuting(true);
    setRunningAgents([]); // Clear any previous agents
    setFeatureStatus(null); // Clear any previous status
    setExpectedAgentCount(agentCount[0]); // Store expected count
    
    try {
      const result = await invoke<{
        branch_names: string[];
        run_ids: number[];
      }>("execute_feature", {
        request: {
          directory,
          ticket,
          agent_count: agentCount[0]
        }
      });
      
      console.log("Feature execution started:", result);
      
      // Keep isExecuting true until all agents are done
      // The UI will show the progress
    } catch (error) {
      setFeatureStatus(null);
      setIsExecuting(false); // Reset on error
      console.error("Failed to execute feature:", error);
      alert(`Failed to execute feature: ${error}`);
    }
    // Don't reset isExecuting here - wait for agents to complete
  };

  // Listen for agent events
  useEffect(() => {
    let unlistenStart: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenStart = await listen<{
        agent_index: number;
        branch_name: string;
        run_id: number;
        pid?: number;
        terminal?: boolean;
      }>("feature-agent-started", (event) => {
        console.log("Agent started:", event.payload);
        setRunningAgents(prev => {
          const updated = [...prev, event.payload];
          
          // Check if all expected agents have been spawned
          if (updated.length >= expectedAgentCount && expectedAgentCount > 0) {
            // All agents spawned, reset execution state after a delay
            setTimeout(() => {
              setIsExecuting(false);
              setExpectedAgentCount(0);
            }, 2000);
          }
          
          return updated;
        });
      });

      unlistenComplete = await listen<boolean>("agent-complete", (event) => {
        console.log("Agent completed:", event.payload);
        // Check if all agents are done
        // This is a simplified check - in production you'd track individual agents
      });

      unlistenStatus = await listen<{
        status: string;
        message: string;
      }>("feature-status", (event) => {
        console.log("Feature status:", event.payload);
        setFeatureStatus(event.payload);
        
        // No need to check here anymore since we check in agent-started event
      });
    };

    setupListeners();

    return () => {
      unlistenStart?.();
      unlistenComplete?.();
      unlistenStatus?.();
    };
  }, [expectedAgentCount]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Feature Implementation</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 space-y-6">
              {/* Directory Selection */}
              <div className="space-y-2">
                <Label htmlFor="directory">Project Directory</Label>
                <div className="flex gap-2">
                  <Input
                    id="directory"
                    value={directory}
                    onChange={(e) => setDirectory(e.target.value)}
                    placeholder="Select or enter project directory"
                    className="flex-1"
                    disabled={isExecuting}
                  />
                  <Button
                    onClick={handleSelectDirectory}
                    variant="outline"
                    size="icon"
                    disabled={isExecuting}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose the directory where the feature will be implemented
                </p>
              </div>

              {/* Feature Ticket */}
              <div className="space-y-2">
                <Label htmlFor="ticket">Feature Description</Label>
                <Textarea
                  id="ticket"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="Write a detailed description of the feature you want to implement..."
                  className="min-h-[200px]"
                  disabled={isExecuting}
                />
                <p className="text-sm text-muted-foreground">
                  Be as detailed as possible. This description will be given to each agent.
                </p>
              </div>

              {/* Agent Count */}
              <div className="space-y-2">
                <Label htmlFor="agentCount">Number of Agents: {agentCount[0]}</Label>
                <Slider
                  id="agentCount"
                  value={agentCount}
                  onValueChange={setAgentCount}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                  disabled={isExecuting}
                />
                <p className="text-sm text-muted-foreground">
                  Each agent will work independently on a separate branch
                </p>
              </div>

              {/* Execute Button */}
              <Button
                onClick={handleExecuteFeature}
                disabled={isExecuting || !directory || !ticket.trim()}
                className="w-full"
                size="lg"
              >
                {isExecuting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <GitBranch className="h-4 w-4" />
                    </motion.div>
                    Executing Feature...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Feature with {agentCount[0]} Agent{agentCount[0] > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </Card>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">How it works</h3>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>Select a project directory with a git repository</li>
                <li>Write a detailed feature description</li>
                <li>Choose how many agents should implement the feature</li>
                <li>Each agent will create a separate branch and implementation</li>
                <li>When complete, each agent will submit a pull request</li>
              </ol>
            </Card>
          </motion.div>

          {/* Feature Status */}
          {featureStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="p-4 border-blue-500/50">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <GitBranch className="h-4 w-4 text-blue-500" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-sm">{featureStatus.status === 'creating_issue' ? 'Creating GitHub Issue' : 'Issue Created'}</p>
                    <p className="text-xs text-muted-foreground">{featureStatus.message}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Execution Status Card */}
          {isExecuting && runningAgents.length === 0 && !featureStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Card className="p-4 border-orange-500/50 bg-orange-50/10">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <GitBranch className="h-4 w-4 text-orange-500" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-sm text-orange-600">Initializing Feature Execution</p>
                    <p className="text-xs text-muted-foreground">Please wait while we set up your agents...</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Running Agents */}
          {runningAgents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Running Agents</h3>
                <div className="space-y-2">
                  {runningAgents.map((agent) => (
                    <div key={agent.run_id} className="flex items-center justify-between text-sm">
                      <span>Agent {agent.agent_index}</span>
                      <span className="text-muted-foreground">{agent.branch_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {agent.terminal ? 'Terminal' : `PID: ${agent.pid}`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}