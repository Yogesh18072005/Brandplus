export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clerk_user_id: string | null;
          email: string | null;
          full_name: string | null;
          company_name: string | null;
          plan: string;
          credits_remaining: number;
          credits_reset_at: string | null;
          free_credit_status: 'pending' | 'granted' | 'blocked';
          plan_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          clerk_user_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          company_name?: string | null;
          plan?: string;
          credits_remaining?: number;
          credits_reset_at?: string | null;
          free_credit_status?: 'pending' | 'granted' | 'blocked';
          plan_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          company_name?: string | null;
          plan?: string;
          credits_remaining?: number;
          credits_reset_at?: string | null;
          free_credit_status?: 'pending' | 'granted' | 'blocked';
          plan_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          website: string;
          category: string;
          city: string;
          competitors: Json;
          aliases: Json;
          products: Json;
          services: Json;
          locations: Json;
          target_customers: Json;
          markets: Json;
          status: string;
          prompt_set: Json | null;
          prompt_set_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          website: string;
          category: string;
          city: string;
          competitors?: Json;
          aliases?: Json;
          products?: Json;
          services?: Json;
          locations?: Json;
          target_customers?: Json;
          markets?: Json;
          status?: string;
          prompt_set?: Json | null;
          prompt_set_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_name?: string;
          website?: string;
          category?: string;
          city?: string;
          competitors?: Json;
          aliases?: Json;
          products?: Json;
          services?: Json;
          locations?: Json;
          target_customers?: Json;
          markets?: Json;
          status?: string;
          prompt_set?: Json | null;
          prompt_set_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "projects_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      audits: {
        Row: {
          id: string;
          project_id: string;
          status: string;
          trigger_type: string;
          report_data: Json | null;
          prompt_count: number;
          cost_estimate_cents: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          status?: string;
          trigger_type?: string;
          report_data?: Json | null;
          prompt_count?: number;
          cost_estimate_cents?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          status?: string;
          trigger_type?: string;
          report_data?: Json | null;
          prompt_count?: number;
          cost_estimate_cents?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "audits_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }];
      };
      audit_results: {
        Row: {
          id: string;
          audit_id: string;
          prompt_text: string;
          intent: string;
          engine: string;
          answer_text: string;
          citations: Json;
          parsed: Json | null;
          grounded: boolean | null;
          error: string | null;
          intent_weight: number;
          observed_at: string | null;
          execution_metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          audit_id: string;
          prompt_text: string;
          intent: string;
          engine?: string;
          answer_text?: string;
          citations?: Json;
          parsed?: Json | null;
          grounded?: boolean | null;
          error?: string | null;
          intent_weight?: number;
          observed_at?: string | null;
          execution_metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          audit_id?: string;
          prompt_text?: string;
          intent?: string;
          engine?: string;
          answer_text?: string;
          citations?: Json;
          parsed?: Json | null;
          grounded?: boolean | null;
          error?: string | null;
          intent_weight?: number;
          observed_at?: string | null;
          execution_metadata?: Json;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "audit_results_audit_id_fkey"; columns: ["audit_id"]; isOneToOne: false; referencedRelation: "audits"; referencedColumns: ["id"] }];
      };
      generated_content: {
        Row: {
          id: string;
          project_id: string;
          content_type: string;
          title: string;
          body: string;
          meta_description: string | null;
          schema_markup: Json | null;
          keywords: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          content_type: string;
          title: string;
          body?: string;
          meta_description?: string | null;
          schema_markup?: Json | null;
          keywords?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          content_type?: string;
          title?: string;
          body?: string;
          meta_description?: string | null;
          schema_markup?: Json | null;
          keywords?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [{ foreignKeyName: "generated_content_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }];
      };
      schema_markups: {
        Row: {
          id: string;
          project_id: string;
          page_url: string | null;
          schema_type: string;
          json_ld: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          page_url?: string | null;
          schema_type: string;
          json_ld: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          page_url?: string | null;
          schema_type?: string;
          json_ld?: Json;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "schema_markups_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }];
      };
      page_analyses: {
        Row: {
          id: string;
          project_id: string;
          page_url: string;
          scores: Json;
          recommendations: Json;
          overall_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          page_url: string;
          scores?: Json;
          recommendations?: Json;
          overall_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          page_url?: string;
          scores?: Json;
          recommendations?: Json;
          overall_score?: number;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "page_analyses_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }];
      };
      tracking_snapshots: {
        Row: {
          id: string;
          project_id: string;
          audit_id: string | null;
          snapshot_date: string;
          visibility_score: number;
          presence_rate: number;
          share_of_voice: number;
          competitor_data: Json;
          brandpulse_score: number;
          recommendation_rate: number;
          citation_rate: number;
          commercial_visibility: number;
          prompt_coverage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          audit_id?: string | null;
          snapshot_date?: string;
          visibility_score?: number;
          presence_rate?: number;
          share_of_voice?: number;
          competitor_data?: Json;
          brandpulse_score?: number;
          recommendation_rate?: number;
          citation_rate?: number;
          commercial_visibility?: number;
          prompt_coverage?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          audit_id?: string | null;
          snapshot_date?: string;
          visibility_score?: number;
          presence_rate?: number;
          share_of_voice?: number;
          competitor_data?: Json;
          brandpulse_score?: number;
          recommendation_rate?: number;
          citation_rate?: number;
          commercial_visibility?: number;
          prompt_coverage?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tracking_snapshots_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "tracking_snapshots_audit_id_fkey"; columns: ["audit_id"]; isOneToOne: false; referencedRelation: "audits"; referencedColumns: ["id"] },
        ];
      };
      audit_queue: {
        Row: {
          id: string;
          project_id: string;
          audit_id: string | null;
          observation_run_id: string | null;
          diagnosis_run_id: string | null;
          intervention_run_id: string | null;
          execution_run_id: string | null;
          job_type: string;
          priority: number;
          status: string;
          attempts: number;
          max_attempts: number;
          error: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          available_at: string;
          last_heartbeat_at: string | null;
          requires_approval: boolean;
          requested_by: string | null;
          credit_mode: 'charge' | 'free' | null;
          approved_at: string | null;
          credit_charged_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          audit_id?: string | null;
          observation_run_id?: string | null;
          diagnosis_run_id?: string | null;
          intervention_run_id?: string | null;
          execution_run_id?: string | null;
          job_type?: string;
          priority?: number;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          error?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          available_at?: string;
          last_heartbeat_at?: string | null;
          requires_approval?: boolean;
          requested_by?: string | null;
          credit_mode?: 'charge' | 'free' | null;
          approved_at?: string | null;
          credit_charged_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          audit_id?: string | null;
          observation_run_id?: string | null;
          diagnosis_run_id?: string | null;
          intervention_run_id?: string | null;
          execution_run_id?: string | null;
          job_type?: string;
          priority?: number;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          error?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          available_at?: string;
          last_heartbeat_at?: string | null;
          requires_approval?: boolean;
          requested_by?: string | null;
          credit_mode?: 'charge' | 'free' | null;
          approved_at?: string | null;
          credit_charged_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "audit_queue_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "audit_queue_audit_id_fkey"; columns: ["audit_id"]; isOneToOne: false; referencedRelation: "audits"; referencedColumns: ["id"] },
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          amount_paise: number;
          currency: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          status: string;
          credits_granted: number;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          amount_paise: number;
          currency?: string;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          status?: string;
          credits_granted?: number;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          amount_paise?: number;
          currency?: string;
          razorpay_order_id?: string;
          razorpay_payment_id?: string | null;
          status?: string;
          credits_granted?: number;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [{ foreignKeyName: "payments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      leads: {
        Row: {
          id: string;
          email: string;
          input: Json;
          status: string;
          claimed_by: string | null;
          project_id: string | null;
          audit_id: string | null;
          created_at: string;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          input: Json;
          status?: string;
          claimed_by?: string | null;
          project_id?: string | null;
          audit_id?: string | null;
          created_at?: string;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          input?: Json;
          status?: string;
          claimed_by?: string | null;
          project_id?: string | null;
          audit_id?: string | null;
          created_at?: string;
          claimed_at?: string | null;
        };
        Relationships: [];
      };
      rate_limit_buckets: {
        Row: { scope: string; key_hash: string; window_start: string; request_count: number; updated_at: string };
        Insert: { scope: string; key_hash: string; window_start: string; request_count?: number; updated_at?: string };
        Update: { scope?: string; key_hash?: string; window_start?: string; request_count?: number; updated_at?: string };
        Relationships: [];
      };
      operational_events: {
        Row: { id: string; event_type: string; severity: string; project_id: string | null; audit_id: string | null; metadata: Json; created_at: string };
        Insert: { id?: string; event_type: string; severity?: string; project_id?: string | null; audit_id?: string | null; metadata?: Json; created_at?: string };
        Update: { id?: string; event_type?: string; severity?: string; project_id?: string | null; audit_id?: string | null; metadata?: Json; created_at?: string };
        Relationships: [];
      };
      scheduler_runs: {
        Row: { id: string; job_name: string; status: string; queued_count: number; error: string | null; started_at: string; completed_at: string | null };
        Insert: { id?: string; job_name: string; status: string; queued_count?: number; error?: string | null; started_at?: string; completed_at?: string | null };
        Update: { id?: string; job_name?: string; status?: string; queued_count?: number; error?: string | null; started_at?: string; completed_at?: string | null };
        Relationships: [];
      };
      monitored_prompts: {
        Row: { id: string; project_id: string; prompt_set_version: number; prompt_text: string; intent: string; intent_weight: number; active: boolean; created_at: string };
        Insert: { id?: string; project_id: string; prompt_set_version: number; prompt_text: string; intent: string; intent_weight?: number; active?: boolean; created_at?: string };
        Update: { id?: string; project_id?: string; prompt_set_version?: number; prompt_text?: string; intent?: string; intent_weight?: number; active?: boolean; created_at?: string };
        Relationships: [];
      };
      audit_citations: {
        Row: { id: string; audit_result_id: string; audit_id: string; url: string; domain: string; title: string | null; source_type: string; created_at: string };
        Insert: { id?: string; audit_result_id: string; audit_id: string; url: string; domain: string; title?: string | null; source_type?: string; created_at?: string };
        Update: { id?: string; audit_result_id?: string; audit_id?: string; url?: string; domain?: string; title?: string | null; source_type?: string; created_at?: string };
        Relationships: [];
      };
      action_items: {
        Row: { id: string; project_id: string; audit_id: string | null; title: string; problem: string; why_it_matters: string; evidence: Json; recommended_action: string; expected_objective: string; implementation_guidance: string; priority: string; confidence: string; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; audit_id?: string | null; title: string; problem: string; why_it_matters: string; evidence?: Json; recommended_action: string; expected_objective: string; implementation_guidance: string; priority: string; confidence?: string; status?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; project_id?: string; audit_id?: string | null; title?: string; problem?: string; why_it_matters?: string; evidence?: Json; recommended_action?: string; expected_objective?: string; implementation_guidance?: string; priority?: string; confidence?: string; status?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      experiments: {
        Row: { id: string; project_id: string; title: string; change_summary: string; affected_page: string | null; target_cluster: string | null; implemented_at: string; baseline_audit_id: string | null; comparison_audit_id: string | null; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; title: string; change_summary: string; affected_page?: string | null; target_cluster?: string | null; implemented_at: string; baseline_audit_id?: string | null; comparison_audit_id?: string | null; status?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; project_id?: string; title?: string; change_summary?: string; affected_page?: string | null; target_cluster?: string | null; implemented_at?: string; baseline_audit_id?: string | null; comparison_audit_id?: string | null; status?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      business_understanding_runs: {
        Row: { id: string; project_id: string; status: string; website: string; content_hash: string; extraction_version: string; prompt_version: string; schema_version: string; model: string; source_coverage: Json; warnings: Json; failure_message: string | null; started_at: string; completed_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; status: string; website: string; content_hash: string; extraction_version: string; prompt_version: string; schema_version: string; model: string; source_coverage?: Json; warnings?: Json; failure_message?: string | null; started_at?: string; completed_at?: string | null; created_at?: string };
        Update: { status?: string; source_coverage?: Json; warnings?: Json; failure_message?: string | null; completed_at?: string | null };
        Relationships: [];
      };
      business_profiles: {
        Row: { id: string; run_id: string; project_id: string; business_name: string; website: string; description: string | null; description_evidence_keys: Json; business_model: string | null; business_model_evidence_keys: Json; created_at: string };
        Insert: { id?: string; run_id: string; project_id: string; business_name: string; website: string; description?: string | null; description_evidence_keys?: Json; business_model?: string | null; business_model_evidence_keys?: Json; created_at?: string };
        Update: { business_name?: string; website?: string; description?: string | null; description_evidence_keys?: Json; business_model?: string | null; business_model_evidence_keys?: Json };
        Relationships: [];
      };
      business_source_pages: {
        Row: { id: string; run_id: string; project_id: string; source_url: string; canonical_url: string; page_title: string; source_type: string; crawl_status: string; content_hash: string | null; http_status: number | null; fetched_at: string; warning: string | null };
        Insert: { id?: string; run_id: string; project_id: string; source_url: string; canonical_url: string; page_title?: string; source_type: string; crawl_status: string; content_hash?: string | null; http_status?: number | null; fetched_at: string; warning?: string | null };
        Update: { page_title?: string; source_type?: string; crawl_status?: string; content_hash?: string | null; http_status?: number | null; fetched_at?: string; warning?: string | null };
        Relationships: [];
      };
      business_evidence: {
        Row: { id: string; run_id: string; project_id: string; source_page_id: string | null; evidence_key: string; evidence_text: string; confidence: string; extracted_at: string };
        Insert: { id?: string; run_id: string; project_id: string; source_page_id?: string | null; evidence_key: string; evidence_text: string; confidence: string; extracted_at: string };
        Update: { source_page_id?: string | null; evidence_text?: string; confidence?: string; extracted_at?: string };
        Relationships: [];
      };
      business_entities: {
        Row: { id: string; run_id: string; project_id: string; entity_key: string; entity_type: string; value: string; normalized_value: string; description: string | null; category: string | null; statement_kind: string; confidence: string };
        Insert: { id?: string; run_id: string; project_id: string; entity_key: string; entity_type: string; value: string; normalized_value: string; description?: string | null; category?: string | null; statement_kind: string; confidence: string };
        Update: { value?: string; description?: string | null; category?: string | null; statement_kind?: string; confidence?: string };
        Relationships: [];
      };
      business_entity_evidence: {
        Row: { entity_id: string; evidence_id: string };
        Insert: { entity_id: string; evidence_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      business_conflicts: {
        Row: { id: string; run_id: string; project_id: string; conflict_key: string; topic: string; conflicting_values: Json; resolution: string };
        Insert: { id?: string; run_id: string; project_id: string; conflict_key: string; topic: string; conflicting_values: Json; resolution?: string };
        Update: { topic?: string; conflicting_values?: Json; resolution?: string };
        Relationships: [];
      };
      business_conflict_evidence: {
        Row: { conflict_id: string; evidence_id: string };
        Insert: { conflict_id: string; evidence_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      business_unknowns: {
        Row: { id: string; run_id: string; project_id: string; unknown_key: string; area: string; reason: string; detail: string; evidence_keys: Json };
        Insert: { id?: string; run_id: string; project_id: string; unknown_key: string; area: string; reason: string; detail: string; evidence_keys?: Json };
        Update: { area?: string; reason?: string; detail?: string; evidence_keys?: Json };
        Relationships: [];
      };
      buyer_intent_runs: {
        Row: { id: string; project_id: string; business_understanding_run_id: string; status: string; requested_question_count: number; candidate_count: number; selected_question_count: number; rejected_candidate_count: number; engine_version: string; prompt_version: string; schema_version: string; generation_version: string; ranking_version: string; business_understanding_version: string; business_understanding_content_hash: string; model: string; warnings: Json; failure_message: string | null; started_at: string; completed_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; business_understanding_run_id: string; status: string; requested_question_count: number; candidate_count?: number; selected_question_count?: number; rejected_candidate_count?: number; engine_version: string; prompt_version: string; schema_version: string; generation_version: string; ranking_version: string; business_understanding_version: string; business_understanding_content_hash: string; model: string; warnings?: Json; failure_message?: string | null; started_at?: string; completed_at?: string | null; created_at?: string };
        Update: { status?: string; candidate_count?: number; selected_question_count?: number; rejected_candidate_count?: number; warnings?: Json; failure_message?: string | null; started_at?: string; completed_at?: string | null; prompt_version?: string; schema_version?: string; generation_version?: string; ranking_version?: string; business_understanding_version?: string; business_understanding_content_hash?: string; model?: string };
        Relationships: [];
      };
      buyer_question_sets: {
        Row: { id: string; run_id: string; project_id: string; business_understanding_run_id: string; set_key: string; is_frozen: boolean; question_count: number; finalized_at: string | null; created_at: string };
        Insert: { id?: string; run_id: string; project_id: string; business_understanding_run_id: string; set_key: string; is_frozen?: boolean; question_count?: number; finalized_at?: string | null; created_at?: string };
        Update: { is_frozen?: boolean; question_count?: number; finalized_at?: string | null };
        Relationships: [];
      };
      buyer_questions: {
        Row: { id: string; question_set_id: string; project_id: string; question_key: string; question: string; normalized_question: string; intent: string; buyer_stage: string; commercial_relevance: number; business_relevance: number; specificity: number; dimensions: Json; rationale: string; supporting_business_evidence_keys: Json; supporting_business_entity_keys: Json; confidence: string; priority_score: number; rank: number; created_at: string };
        Insert: { id?: string; question_set_id: string; project_id: string; question_key: string; question: string; normalized_question: string; intent: string; buyer_stage: string; commercial_relevance: number; business_relevance: number; specificity: number; dimensions?: Json; rationale: string; supporting_business_evidence_keys?: Json; supporting_business_entity_keys?: Json; confidence: string; priority_score: number; rank: number; created_at?: string };
        Update: { question?: string; normalized_question?: string; intent?: string; buyer_stage?: string; commercial_relevance?: number; business_relevance?: number; specificity?: number; dimensions?: Json; rationale?: string; supporting_business_evidence_keys?: Json; supporting_business_entity_keys?: Json; confidence?: string; priority_score?: number; rank?: number };
        Relationships: [];
      };
      ai_observation_runs: {
        Row: { id: string; project_id: string; buyer_question_set_id: string; business_understanding_run_id: string | null; provider: string; model: string; model_version: string | null; provider_adapter_version: string; engine_version: string; prompt_version: string; parser_version: string; schema_version: string; generation_parameters: Json; status: string; requested_question_count: number; completed_question_count: number; failed_question_count: number; input_tokens: number | null; output_tokens: number | null; total_tokens: number | null; cost_usd: number | null; idempotency_key: string; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; buyer_question_set_id: string; business_understanding_run_id?: string | null; provider: string; model: string; model_version?: string | null; provider_adapter_version: string; engine_version: string; prompt_version: string; parser_version: string; schema_version: string; generation_parameters?: Json; status?: string; requested_question_count: number; completed_question_count?: number; failed_question_count?: number; input_tokens?: number | null; output_tokens?: number | null; total_tokens?: number | null; cost_usd?: number | null; idempotency_key: string; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { model_version?: string | null; status?: string; completed_question_count?: number; failed_question_count?: number; input_tokens?: number | null; output_tokens?: number | null; total_tokens?: number | null; cost_usd?: number | null; started_at?: string | null; completed_at?: string | null };
        Relationships: [];
      };
      ai_question_observations: {
        Row: { id: string; run_id: string; project_id: string; buyer_question_id: string; buyer_question_key: string; exact_question: string; question_rank: number; status: string; provider: string; model: string; model_version: string | null; provider_response_id: string | null; response_timestamp: string | null; latency_ms: number | null; input_tokens: number | null; output_tokens: number | null; total_tokens: number | null; cost_usd: number | null; response_completeness: string; parsing_status: string; extraction_status: string; target_entity_status: string; error_code: string | null; error_message: string | null; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; run_id: string; project_id: string; buyer_question_id: string; buyer_question_key: string; exact_question: string; question_rank: number; status?: string; provider: string; model: string; model_version?: string | null; provider_response_id?: string | null; response_timestamp?: string | null; latency_ms?: number | null; input_tokens?: number | null; output_tokens?: number | null; total_tokens?: number | null; cost_usd?: number | null; response_completeness?: string; parsing_status?: string; extraction_status?: string; target_entity_status?: string; error_code?: string | null; error_message?: string | null; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { status?: string; provider?: string; model?: string; model_version?: string | null; provider_response_id?: string | null; response_timestamp?: string | null; latency_ms?: number | null; input_tokens?: number | null; output_tokens?: number | null; total_tokens?: number | null; cost_usd?: number | null; response_completeness?: string; parsing_status?: string; extraction_status?: string; target_entity_status?: string; error_code?: string | null; error_message?: string | null; started_at?: string | null; completed_at?: string | null };
        Relationships: [];
      };
      ai_raw_responses: {
        Row: { id: string; question_observation_id: string; project_id: string; raw_text: string; provider_response_id: string | null; finish_reason: string | null; provider_metadata: Json; created_at: string };
        Insert: { id?: string; question_observation_id: string; project_id: string; raw_text: string; provider_response_id?: string | null; finish_reason?: string | null; provider_metadata?: Json; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_observed_entities: {
        Row: { id: string; question_observation_id: string; project_id: string; entity_key: string; surface_form: string; normalized_name: string; entity_type: string; match_status: string; target_match: boolean; mention_count: number; first_character_position: number; first_paragraph_position: number; recommendation_position: number | null; recommendation_strength: string; created_at: string };
        Insert: { id?: string; question_observation_id: string; project_id: string; entity_key: string; surface_form: string; normalized_name: string; entity_type: string; match_status: string; target_match: boolean; mention_count: number; first_character_position: number; first_paragraph_position: number; recommendation_position?: number | null; recommendation_strength: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_entity_mentions: {
        Row: { id: string; observed_entity_id: string; question_observation_id: string; project_id: string; surface_form: string; character_position: number; paragraph_position: number; context: string; created_at: string };
        Insert: { id?: string; observed_entity_id: string; question_observation_id: string; project_id: string; surface_form: string; character_position: number; paragraph_position: number; context: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_observed_sources: {
        Row: { id: string; question_observation_id: string; project_id: string; source_key: string; full_url: string | null; normalized_url: string | null; domain: string | null; title: string | null; target_domain_match: boolean; created_at: string };
        Insert: { id?: string; question_observation_id: string; project_id: string; source_key: string; full_url?: string | null; normalized_url?: string | null; domain?: string | null; title?: string | null; target_domain_match?: boolean; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_citation_observations: {
        Row: { id: string; question_observation_id: string; project_id: string; source_id: string | null; citation_key: string; displayed_text: string | null; observed_url: string | null; observed_domain: string | null; source_title: string | null; provider_citation_id: string | null; citation_context: string | null; character_position: number | null; claim_association: string; provider_metadata: Json; created_at: string };
        Insert: { id?: string; question_observation_id: string; project_id: string; source_id?: string | null; citation_key: string; displayed_text?: string | null; observed_url?: string | null; observed_domain?: string | null; source_title?: string | null; provider_citation_id?: string | null; citation_context?: string | null; character_position?: number | null; claim_association: string; provider_metadata?: Json; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      evidence_diagnosis_runs: {
        Row: { id: string; project_id: string; business_understanding_run_id: string; buyer_question_set_id: string; observation_run_id: string; status: string; input_hash: string; idempotency_key: string; engine_version: string; prompt_version: string; schema_version: string; diagnosis_version: string; matching_version: string; model: string | null; model_version: string | null; business_understanding_version: string; business_understanding_content_hash: string; buyer_question_set_version: string; buyer_question_set_hash: string; observation_engine_version: string; observation_run_hash: string; requested_question_count: number; completed_question_count: number; failed_question_count: number; inconclusive_question_count: number; evidence_count: number; gap_count: number; llm_call_count: number; input_tokens: number | null; output_tokens: number | null; cost_usd: number; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; business_understanding_run_id: string; buyer_question_set_id: string; observation_run_id: string; status?: string; input_hash: string; idempotency_key: string; engine_version: string; prompt_version: string; schema_version: string; diagnosis_version: string; matching_version: string; model?: string | null; model_version?: string | null; business_understanding_version: string; business_understanding_content_hash: string; buyer_question_set_version: string; buyer_question_set_hash: string; observation_engine_version: string; observation_run_hash: string; requested_question_count: number; completed_question_count?: number; failed_question_count?: number; inconclusive_question_count?: number; evidence_count?: number; gap_count?: number; llm_call_count?: number; input_tokens?: number | null; output_tokens?: number | null; cost_usd?: number; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { status?: string; completed_question_count?: number; failed_question_count?: number; inconclusive_question_count?: number; evidence_count?: number; gap_count?: number; llm_call_count?: number; input_tokens?: number | null; output_tokens?: number | null; cost_usd?: number; started_at?: string | null; completed_at?: string | null };
        Relationships: [];
      };
      evidence_question_diagnoses: {
        Row: { id: string; run_id: string; project_id: string; diagnosis_key: string; buyer_question_id: string; buyer_question_key: string; question_observation_id: string; exact_question: string; question_rank: number; status: string; target_mention_status: string; classifications: string[]; primary_classification: string | null; commercial_implication: string; confidence: string; evidence_scope: string; evidence_comparison: string; error_message: string | null; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; run_id: string; project_id: string; diagnosis_key: string; buyer_question_id: string; buyer_question_key: string; question_observation_id: string; exact_question: string; question_rank: number; status?: string; target_mention_status?: string; classifications?: string[]; primary_classification?: string | null; commercial_implication?: string; confidence?: string; evidence_scope?: string; evidence_comparison?: string; error_message?: string | null; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { diagnosis_key?: string; status?: string; target_mention_status?: string; classifications?: string[]; primary_classification?: string | null; commercial_implication?: string; confidence?: string; evidence_scope?: string; evidence_comparison?: string; error_message?: string | null; started_at?: string | null; completed_at?: string | null };
        Relationships: [];
      };
      evidence_assessments: {
        Row: { id: string; question_diagnosis_id: string; project_id: string; assessment_key: string; origin: string; subject_entity_key: string | null; evidence_type: string; evidence_status: string; relevance: string; specificity: string; directness: string; freshness: string; source_reliability: string; source_hierarchy: string; provenance_completeness: string; confidence: string; evidence_scope: string; statement: string; created_at: string };
        Insert: { id?: string; question_diagnosis_id: string; project_id: string; assessment_key: string; origin: string; subject_entity_key?: string | null; evidence_type: string; evidence_status: string; relevance: string; specificity: string; directness: string; freshness: string; source_reliability: string; source_hierarchy: string; provenance_completeness: string; confidence: string; evidence_scope: string; statement: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      evidence_gaps: {
        Row: { id: string; question_diagnosis_id: string; project_id: string; gap_key: string; gap_type: string; question_dimension: string; description: string; target_evidence_present: boolean; observed_entity_evidence_present: boolean; evidence_strength: string; confidence: string; evidence_scope: string; created_at: string };
        Insert: { id?: string; question_diagnosis_id: string; project_id: string; gap_key: string; gap_type: string; question_dimension: string; description: string; target_evidence_present: boolean; observed_entity_evidence_present: boolean; evidence_strength: string; confidence: string; evidence_scope: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      evidence_gap_support: {
        Row: { gap_id: string; question_diagnosis_id: string; source_evidence_key: string };
        Insert: { gap_id: string; question_diagnosis_id: string; source_evidence_key: string };
        Update: Record<string, never>; Relationships: [];
      };
      diagnosis_claims: {
        Row: { id: string; question_diagnosis_id: string; project_id: string; claim_key: string; classification: string; statement: string; confidence: string; created_at: string };
        Insert: { id?: string; question_diagnosis_id: string; project_id: string; claim_key: string; classification: string; statement: string; confidence: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      diagnosed_entity_relationships: {
        Row: { id: string; question_diagnosis_id: string; project_id: string; relationship_key: string; observed_entity_key: string; surface_form: string; relationship: string; confidence: string; rationale: string; created_at: string };
        Insert: { id?: string; question_diagnosis_id: string; project_id: string; relationship_key: string; observed_entity_key: string; surface_form: string; relationship: string; confidence: string; rationale: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      diagnosis_unknowns: {
        Row: { id: string; question_diagnosis_id: string; project_id: string; unknown_key: string; area: string; reason: string; detail: string; created_at: string };
        Insert: { id?: string; question_diagnosis_id: string; project_id: string; unknown_key: string; area: string; reason: string; detail: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      diagnosis_provenance: {
        Row: { id: string; question_diagnosis_id: string; project_id: string; artifact_kind: string; artifact_key: string; provenance_kind: string; source_key: string; source_url: string | null; source_title: string | null; source_type: string | null; snippet: string | null; source_timestamp: string | null; created_at: string };
        Insert: { id?: string; question_diagnosis_id: string; project_id: string; artifact_kind: string; artifact_key: string; provenance_kind: string; source_key: string; source_url?: string | null; source_title?: string | null; source_type?: string | null; snippet?: string | null; source_timestamp?: string | null; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_generation_runs: {
        Row: { id: string; project_id: string; diagnosis_run_id: string; business_understanding_run_id: string; buyer_question_set_id: string; observation_run_id: string; status: string; input_hash: string; result_hash: string | null; idempotency_key: string; engine_version: string; schema_version: string; prompt_version: string; generation_version: string; priority_version: string; model: string; model_version: string | null; generation_parameters: Json; business_understanding_version: string; business_understanding_hash: string; buyer_question_set_version: string; buyer_question_set_hash: string; observation_version: string; observation_hash: string; diagnosis_version: string; diagnosis_hash: string; eligible_gap_count: number; intervention_count: number; rejected_candidate_count: number; llm_call_count: number; input_tokens: number; output_tokens: number; cost_usd: number; error_message: string | null; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; diagnosis_run_id: string; business_understanding_run_id: string; buyer_question_set_id: string; observation_run_id: string; status?: string; input_hash: string; result_hash?: string | null; idempotency_key: string; engine_version: string; schema_version: string; prompt_version: string; generation_version: string; priority_version: string; model: string; model_version?: string | null; generation_parameters?: Json; business_understanding_version: string; business_understanding_hash: string; buyer_question_set_version: string; buyer_question_set_hash: string; observation_version: string; observation_hash: string; diagnosis_version: string; diagnosis_hash: string; eligible_gap_count?: number; intervention_count?: number; rejected_candidate_count?: number; llm_call_count?: number; input_tokens?: number; output_tokens?: number; cost_usd?: number; error_message?: string | null; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { status?: string; result_hash?: string | null; model_version?: string | null; eligible_gap_count?: number; intervention_count?: number; rejected_candidate_count?: number; llm_call_count?: number; input_tokens?: number; output_tokens?: number; cost_usd?: number; error_message?: string | null; started_at?: string | null; completed_at?: string | null };
        Relationships: [];
      };
      generated_interventions: {
        Row: { id: string; run_id: string; project_id: string; intervention_key: string; primary_diagnosis_key: string; primary_question_key: string; exact_buyer_question: string; intervention_type: string; category: string; title: string; objective: string; problem_statement: string; diagnosed_gap: string; why_addresses_gap: string; expected_deliverable: string; implementation_surface: string; proposed_surface: boolean; priority: string; priority_score: number; priority_factors: Json; impact: string; effort: string; confidence: string; status: string; created_at: string };
        Insert: { id?: string; run_id: string; project_id: string; intervention_key: string; primary_diagnosis_key: string; primary_question_key: string; exact_buyer_question: string; intervention_type: string; category: string; title: string; objective: string; problem_statement: string; diagnosed_gap: string; why_addresses_gap: string; expected_deliverable: string; implementation_surface: string; proposed_surface: boolean; priority: string; priority_score: number; priority_factors: Json; impact: string; effort: string; confidence: string; status: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_question_links: {
        Row: { intervention_id: string; project_id: string; buyer_question_id: string; buyer_question_key: string; exact_question: string };
        Insert: { intervention_id: string; project_id: string; buyer_question_id: string; buyer_question_key: string; exact_question: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_diagnosis_links: {
        Row: { intervention_id: string; project_id: string; question_diagnosis_id: string; evidence_gap_id: string; diagnosis_key: string; gap_key: string };
        Insert: { intervention_id: string; project_id: string; question_diagnosis_id: string; evidence_gap_id: string; diagnosis_key: string; gap_key: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_evidence_links: {
        Row: { id: string; intervention_id: string; project_id: string; link_key: string; link_kind: string; business_evidence_id: string | null; source_evidence_key: string | null; evidence_type: string; description: string };
        Insert: { id?: string; intervention_id: string; project_id: string; link_key: string; link_kind: string; business_evidence_id?: string | null; source_evidence_key?: string | null; evidence_type: string; description: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_inputs: {
        Row: { id: string; intervention_id: string; project_id: string; input_key: string; input_type: string; description: string; status: string };
        Insert: { id?: string; intervention_id: string; project_id: string; input_key: string; input_type: string; description: string; status: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_acceptance_criteria: {
        Row: { id: string; intervention_id: string; project_id: string; criterion_key: string; criterion: string; sort_order: number };
        Insert: { id?: string; intervention_id: string; project_id: string; criterion_key: string; criterion: string; sort_order: number };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_dependencies: {
        Row: { intervention_id: string; project_id: string; depends_on_intervention_id: string };
        Insert: { intervention_id: string; project_id: string; depends_on_intervention_id: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_measurements: {
        Row: { id: string; intervention_id: string; project_id: string; measurement_key: string; measurement_type: string; affected_question_keys: Json; evidence_dimensions: Json; description: string };
        Insert: { id?: string; intervention_id: string; project_id: string; measurement_key: string; measurement_type: string; affected_question_keys: Json; evidence_dimensions: Json; description: string };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_provenance: {
        Row: { id: string; intervention_id: string; project_id: string; provenance_kind: string; source_key: string; source_url: string | null; source_title: string | null; source_type: string | null; snippet: string | null; source_timestamp: string | null };
        Insert: { id?: string; intervention_id: string; project_id: string; provenance_kind: string; source_key: string; source_url?: string | null; source_title?: string | null; source_type?: string | null; snippet?: string | null; source_timestamp?: string | null };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_content_briefs: {
        Row: { intervention_id: string; project_id: string; target_buyer_questions: Json; discovery_intent: string; objective: string; verified_fact_evidence_keys: Json; required_sections: Json; required_facts_to_clarify: Json; prohibited_unsupported_claims: Json; internal_evidence_references: Json; acceptance_criteria: Json };
        Insert: { intervention_id: string; project_id: string; target_buyer_questions: Json; discovery_intent: string; objective: string; verified_fact_evidence_keys: Json; required_sections: Json; required_facts_to_clarify: Json; prohibited_unsupported_claims: Json; internal_evidence_references: Json; acceptance_criteria: Json };
        Update: Record<string, never>; Relationships: [];
      };
      intervention_structured_data: {
        Row: { intervention_id: string; project_id: string; schema_type: string; represented_entity: string; supported_properties: Json; input_required_properties: Json; proposed_surfaces: Json; acceptance_criteria: Json };
        Insert: { intervention_id: string; project_id: string; schema_type: string; represented_entity: string; supported_properties: Json; input_required_properties: Json; proposed_surfaces: Json; acceptance_criteria: Json };
        Update: Record<string, never>; Relationships: [];
      };
      execution_runs: {
        Row: { id: string; project_id: string; intervention_id: string; intervention_run_id: string; diagnosis_run_id: string; observation_run_id: string; buyer_question_set_id: string; business_understanding_run_id: string; active_plan_id: string | null; status: string; idempotency_key: string; execution_key: string; retry_of_execution_id: string | null; attempt_number: number; provider_call_count: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number; external_cost_usd: number; error_code: string | null; error_message: string | null; started_at: string | null; completed_at: string | null; cancelled_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; intervention_id: string; intervention_run_id: string; diagnosis_run_id: string; observation_run_id: string; buyer_question_set_id: string; business_understanding_run_id: string; active_plan_id?: string | null; status: string; idempotency_key: string; execution_key: string; retry_of_execution_id?: string | null; attempt_number?: number; provider_call_count?: number; input_tokens?: number; output_tokens?: number; estimated_cost_usd?: number; external_cost_usd?: number; error_code?: string | null; error_message?: string | null; started_at?: string | null; completed_at?: string | null; cancelled_at?: string | null; created_at?: string };
        Update: { active_plan_id?: string | null; status?: string; provider_call_count?: number; input_tokens?: number; output_tokens?: number; estimated_cost_usd?: number; external_cost_usd?: number; error_code?: string | null; error_message?: string | null; started_at?: string | null; completed_at?: string | null; cancelled_at?: string | null };
        Relationships: [];
      };
      execution_plans: {
        Row: { id: string; execution_id: string; project_id: string; plan_version: number; intervention_id: string; intervention_key: string; diagnosis_key: string; affected_questions: Json; intervention_type: string; target_surface: string; adapter_id: string; adapter_version: string; required_permissions: Json; required_inputs: Json; payload: Json; payload_hash: string; prerequisites: Json; approval_status: string; acceptance_criteria: Json; risk: string; retry_safety: string; rollback: Json; engine_version: string; schema_version: string; payload_version: string; content_generation_version: string | null; upstream_versions: Json; created_at: string };
        Insert: { id?: string; execution_id: string; project_id: string; plan_version: number; intervention_id: string; intervention_key: string; diagnosis_key: string; affected_questions: Json; intervention_type: string; target_surface: string; adapter_id: string; adapter_version: string; required_permissions?: Json; required_inputs?: Json; payload: Json; payload_hash: string; prerequisites?: Json; approval_status: string; acceptance_criteria?: Json; risk: string; retry_safety: string; rollback: Json; engine_version: string; schema_version: string; payload_version: string; content_generation_version?: string | null; upstream_versions: Json; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      execution_steps: {
        Row: { id: string; execution_id: string; plan_id: string; project_id: string; step_key: string; sequence: number; name: string; status: string; retry_safety: string; attempt_count: number; max_attempts: number; rollback_status: string; error_code: string | null; error_message: string | null; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; execution_id: string; plan_id: string; project_id: string; step_key: string; sequence: number; name: string; status?: string; retry_safety: string; attempt_count?: number; max_attempts?: number; rollback_status?: string; error_code?: string | null; error_message?: string | null; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { status?: string; attempt_count?: number; rollback_status?: string; error_code?: string | null; error_message?: string | null; started_at?: string | null; completed_at?: string | null }; Relationships: [];
      };
      execution_approvals: {
        Row: { id: string; project_id: string; execution_id: string; plan_id: string; requested_action: string; requested_scope: string; requested_at: string; approver_id: string | null; approved_at: string | null; expires_at: string | null; status: string; artifact_version: number; payload_hash: string; created_at: string };
        Insert: { id?: string; project_id: string; execution_id: string; plan_id: string; requested_action: string; requested_scope: string; requested_at?: string; approver_id?: string | null; approved_at?: string | null; expires_at?: string | null; status: string; artifact_version: number; payload_hash: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      execution_inputs: {
        Row: { id: string; execution_id: string; plan_id: string; project_id: string; input_key: string; input_type: string; submitted_value: string; value_hash: string; submitted_by: string; submitted_at: string };
        Insert: { id?: string; execution_id: string; plan_id: string; project_id: string; input_key: string; input_type: string; submitted_value: string; value_hash: string; submitted_by: string; submitted_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      execution_artifacts: {
        Row: { id: string; execution_id: string; plan_id: string; step_id: string | null; project_id: string; artifact_type: string; media_type: string; content: Json; content_hash: string; is_draft: boolean; created_at: string };
        Insert: { id?: string; execution_id: string; plan_id: string; step_id?: string | null; project_id: string; artifact_type: string; media_type: string; content: Json; content_hash: string; is_draft: boolean; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      execution_evidence: {
        Row: { id: string; execution_id: string; plan_id: string; step_id: string; project_id: string; request_id: string | null; external_resource_id: string | null; response_status: number | null; resulting_url: string | null; artifact_hash: string | null; before_snapshot_hash: string | null; after_snapshot_hash: string | null; adapter_version: string; execution_status: string; confirmation: string; occurred_at: string; created_at: string };
        Insert: { id?: string; execution_id: string; plan_id: string; step_id: string; project_id: string; request_id?: string | null; external_resource_id?: string | null; response_status?: number | null; resulting_url?: string | null; artifact_hash?: string | null; before_snapshot_hash?: string | null; after_snapshot_hash?: string | null; adapter_version: string; execution_status: string; confirmation: string; occurred_at: string; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
      execution_events: {
        Row: { id: string; project_id: string; execution_id: string; step_id: string | null; actor_type: string; actor_id: string | null; event_type: string; payload_hash: string | null; metadata: Json; created_at: string };
        Insert: { id?: string; project_id: string; execution_id: string; step_id?: string | null; actor_type: string; actor_id?: string | null; event_type: string; payload_hash?: string | null; metadata?: Json; created_at?: string };
        Update: Record<string, never>; Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_clerk_profile: {
        Args: { p_email: string; p_full_name: string };
        Returns: string;
      };
      current_clerk_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      claim_free_signup_credit: {
        Args: { p_profile_id: string; p_network_hash: string };
        Returns: { allowed: boolean; status: string }[];
      };
      claim_free_public_audit: {
        Args: { p_network_hash: string; p_email_hash: string };
        Returns: { allowed: boolean; reason: string }[];
      };
      claim_next_audit_job: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["audit_queue"]["Row"][];
      };
      claim_project_audit_job: {
        Args: { p_project_id: string };
        Returns: Database["public"]["Tables"]["audit_queue"]["Row"][];
      };
      approve_audit_request: {
        Args: { p_queue_id: string; p_mode: 'charge' | 'free' };
        Returns: { ok: boolean; reason: string; remaining: number | null }[];
      };
      claim_account_identity: {
        Args: { p_profile_id: string; p_network_hash: string; p_device_hash: string; p_vpn_suspected: boolean };
        Returns: { allowed: boolean; reason: string; first_claim: boolean }[];
      };
      create_evidence_diagnosis_run: {
        Args: { p_project_id: string; p_observation_run_id: string; p_input_hash: string; p_buyer_question_set_hash: string; p_observation_run_hash: string; p_idempotency_key: string; p_engine_version: string; p_prompt_version: string; p_schema_version: string; p_diagnosis_version: string; p_matching_version: string };
        Returns: { run_id: string; outcome: string }[];
      };
      prepare_evidence_question_diagnosis: { Args: { p_run_id: string; p_buyer_question_key: string }; Returns: undefined };
      complete_evidence_diagnosis_run: { Args: { p_run_id: string }; Returns: string };
      create_intervention_generation_run: {
        Args: { p_project_id: string; p_diagnosis_run_id: string; p_input_hash: string; p_buyer_question_set_hash: string; p_observation_hash: string; p_diagnosis_hash: string; p_idempotency_key: string; p_engine_version: string; p_schema_version: string; p_prompt_version: string; p_generation_version: string; p_priority_version: string; p_model: string; p_generation_parameters: Json };
        Returns: { run_id: string; outcome: string }[];
      };
      prepare_intervention_generation_run: { Args: { p_run_id: string }; Returns: undefined };
      complete_intervention_generation_run: {
        Args: { p_run_id: string; p_result_hash: string; p_eligible_gap_count: number; p_rejected_candidate_count: number; p_llm_call_count: number; p_input_tokens: number; p_output_tokens: number; p_cost_usd: number; p_model_version: string | null };
        Returns: string;
      };
      create_execution_run: {
        Args: { p_project_id: string; p_intervention_id: string; p_idempotency_key: string; p_execution_key: string; p_initial_status: string; p_plan: Json; p_actor_id: string; p_retry_of_execution_id?: string | null; p_attempt_number?: number };
        Returns: { run_id: string; outcome: string }[];
      };
      replace_execution_plan: {
        Args: { p_execution_id: string; p_previous_plan_id: string; p_plan: Json; p_status: string; p_actor_id: string };
        Returns: string;
      };
      transition_execution_run: {
        Args: { p_execution_id: string; p_from: string[]; p_to: string; p_actor_type: string; p_actor_id: string | null; p_event_type: string; p_payload_hash: string | null; p_metadata: Json; p_error_code?: string | null; p_error_message?: string | null };
        Returns: string;
      };
      record_execution_approval: {
        Args: { p_execution_id: string; p_plan_id: string; p_approver_id: string; p_decision: string; p_expires_at: string | null; p_payload_hash: string };
        Returns: string;
      };
      prepare_execution_step: {
        Args: { p_execution_id: string; p_plan_id: string; p_step_key: string; p_name: string; p_sequence: number; p_retry_safety: string; p_max_attempts: number };
        Returns: string;
      };
      complete_execution_step: {
        Args: { p_step_id: string; p_execution_id: string; p_status: string; p_artifact: Json | null; p_evidence: Json; p_error_code: string | null; p_error_message: string | null };
        Returns: string;
      };
      reserve_audit_credit: {
        Args: { p_user_id: string };
        Returns: { ok: boolean; remaining: number; plan: string }[];
      };
      refund_audit_credit: {
        Args: { p_user_id: string };
        Returns: number;
      };
      consume_rate_limit: {
        Args: { p_scope: string; p_key_hash: string; p_limit: number; p_window_seconds: number };
        Returns: { allowed: boolean; remaining: number; reset_at: string }[];
      };
      recover_stale_audit_jobs: {
        Args: { p_stale_minutes?: number };
        Returns: number;
      };
      cleanup_expired_rate_limits: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      create_ai_observation_run: {
        Args: { p_project_id: string; p_buyer_question_set_id: string; p_business_understanding_run_id: string | null; p_provider: string; p_model: string; p_provider_adapter_version: string; p_engine_version: string; p_prompt_version: string; p_parser_version: string; p_schema_version: string; p_generation_parameters: Json; p_idempotency_key: string };
        Returns: { run_id: string; created: boolean }[];
      };
      prepare_ai_question_observation: {
        Args: { p_run_id: string; p_buyer_question_key: string };
        Returns: undefined;
      };
      complete_ai_observation_run: {
        Args: { p_run_id: string };
        Returns: string;
      };
      grant_topup_credits: {
        Args: { p_user_id: string; p_order_id: string; p_payment_id: string };
        Returns: { granted: number; remaining: number }[];
      };
      record_payment_refund: {
        Args: { p_order_id: string; p_payment_id: string };
        Returns: { user_id: string; product: string; entitlement_revoked: boolean }[];
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
