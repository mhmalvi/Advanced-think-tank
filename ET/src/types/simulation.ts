/** Types for the Aether simulation intelligence layer. */

export interface SimulationRun {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
  agent_count: number;
  simulation_steps: number;
  story_count: number;
  total_actions: number;
  polarization_index: number;
  echo_chamber_score: number;
  duration_seconds: number;
  metrics: StoryMetric[];
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

export interface StoryMetric {
  story_id: string;
  engagement_rate: number;
  sentiment_ratio: number;
  share_velocity: number;
  predicted_virality: number;
  like_count: number;
  dislike_count: number;
  share_count: number;
  comment_count: number;
  propagation_depth: number;
}

export interface Entity {
  id: string;
  name: string;
  entity_type:
    | "person"
    | "organization"
    | "country"
    | "commodity"
    | "event"
    | "policy"
    | "technology";
  description?: string;
  mention_count: number;
  first_seen_at?: string;
  last_seen_at?: string;
  metadata?: Record<string, unknown>;
}

export interface EntityRelationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  weight: number;
  article_count: number;
  last_seen_at?: string;
}

export interface GraphData {
  entities: Entity[];
  relationships: EntityRelationship[];
}

export interface PredictRequest {
  scenario: string;
  story_id?: string;
  entity_ids?: string[];
}

export interface PredictResponse {
  scenario: string;
  analysis: string;
  impact_scores: Record<string, number>;
  affected_entity_ids: string[];
  confidence: number;
}

export interface AgentAction {
  agent_id: string;
  archetype: string;
  story_id: string;
  step: number;
  action: "like" | "dislike" | "share" | "comment" | "ignore";
  sentiment: number;
  engagement_depth: number;
  would_share: boolean;
  comment_text: string | null;
  reasoning: string | null;
}

export interface SimulationReport {
  report_id: string;
  run_id: string;
  content: string;
  format: "markdown" | "json";
}

/** Simulation health status derived from latest run. */
export type SimHealthStatus = "green" | "amber" | "red" | "unknown";

/** Archetype names used in propagation breakdowns. */
export type AgentArchetype =
  | "Analyst"
  | "Investor"
  | "Journalist"
  | "PolicyMaker"
  | "Academic"
  | "Public";
